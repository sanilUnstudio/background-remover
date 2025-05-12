'use client'

import { useState, ChangeEvent } from 'react'

export default function Home() {
  const [images, setImages] = useState([]);
  const [uiState, setUiState] = useState("Result will show here");

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files); // Convert FileList to an array

    console.log("sanil", files);
    if (files) {
      console.log("entered in multiplefiles upload");
      setUiState("Loading...");

      try {
        const allData = await Promise.all(
          files.map(async (file) => {
            let responseImageBase64 = null;

            const removeBackgroundResponse = await removeBackgroundPhotoRoom(
              file,
              "sanil@unstudio.ai"
            );

            if (!removeBackgroundResponse?.imageFile) {
              throw new Error("Error in Photoroom!");
            } else {
              // Add a white background to the image
              const imageWithWhiteBackground = await addWhiteBackgroundToImage(
                removeBackgroundResponse.imageFile
              );

              // Convert the resulting blob into a URL
              // responseImageBase64 = URL.createObjectURL(imageWithWhiteBackground);
              responseImageBase64 = URL.createObjectURL(removeBackgroundResponse.imageFile);
            }


            // const blobUrl = URL.createObjectURL(removeBackgroundResponse.imageFile);

            return { url: responseImageBase64 };
          })
        );

        setImages(allData);
        setUiState("done");
        console.log("result", allData);
      } catch (error) {
        console.log("Error uploading products", error);
        setUiState("Error in removing background please try again...");
      }

      e.target.value = "";
    }
  };

  // Helper function to add a white background to the image Blob
  const addWhiteBackgroundToImage = async (imageBlob) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const blobUrl = URL.createObjectURL(imageBlob);

      img.src = blobUrl;

      img.onload = () => {
        // Create a canvas element
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Set canvas dimensions to match the image
        canvas.width = img.width;
        canvas.height = img.height;

        // Fill the canvas with a white background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw the original image on top of the white background
        ctx.drawImage(img, 0, 0);

        // Convert the canvas to a Blob
        canvas.toBlob(
          (resultBlob) => {
            if (resultBlob) {
              resolve(resultBlob); // Return the Blob with the white background
            } else {
              reject(new Error("Failed to convert canvas to Blob"));
            }
          },
          imageBlob.type, // Use the same type as the original Blob (e.g., image/png)
          1.0 // Set quality to 1.0 to preserve original quality
        );

        // Clean up the Blob URL
        URL.revokeObjectURL(blobUrl);
      };

      img.onerror = (err) => {
        reject(err);
      };
    });
  };


  return (
    <div className="min-h-screen w-full p-8">
      <h1 className="text-center text-3xl font-bold mb-8">Background Remover</h1>

      <div className="mb-8 flex justify-center">
        <label htmlFor="image-upload" className="cursor-pointer bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
          Upload Images (Max 20)
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      </div>

      {
        uiState != 'done' ?
          <div className='h-[75vh] flex justify-center items-center border rounded-lg border-dotted'>
            <h1>{uiState }</h1>
          </div>
        : <div className="grid grid-cols-4 gap-4 border overflow-auto h-[75vh]">
        {images.map((src, index) => (
          <div
            key={index}
            onClick={() => downloadImageClientSide(src.url)}
            className="aspect-square relative h-[300px] w-full overflow-hidden rounded-lg shadow-md border border-white border-opacity-40 cursor-pointer"
          >
            <img
              src={src.url}
              alt={`Uploaded image ${index + 1}`}
              fill
              className="object-cover"
            />
          </div>
        ))}
      </div>}

    </div>
  )
}


const convertToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()
    fileReader.readAsDataURL(file)
    fileReader.onload = () => {
      resolve(fileReader.result)
    }
    fileReader.onerror = (error) => {
      reject(error)
    }
  })
}


async function removeBackgroundPhotoRoom(file, userEmail) {
  try {
    const url = 'https://sdk.photoroom.com/v1/segment';
    let fileToUpload = file;

    const form = new FormData();
    // Append file and other parameters to the form
    form.append('image_file', fileToUpload);
    form.append('format', 'png');
    form.append('size', 'full');
    form.append('crop', 'false');

    const options = {
      method: 'POST',
      headers: {
        Accept: 'image/png, application/json',
        'x-api-key': process.env.NEXT_PUBLIC_PHOTOROOM,
        'pr-background-removal-model-version': '2024-09-26'
      },
      body: form
    };

    const response = await fetch(url, options);
    if (response.status === 200) {
      const outputBlob = await response.blob();
      const imageFile = new File([outputBlob], 'bg.png', {
        type: outputBlob.type
      });
      return { imageFile };
    } else {
      console.log(response.status);
      throw new Error(response.statusText);
    }
  } catch (error) {
    return null;
  }
}



async function downloadImageClientSide(imageUrl, fileName = "downloaded-image.jpg") {
  try {
    // Fetch the image as a Blob
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const blob = await response.blob();

    // Create a URL for the Blob
    const blobUrl = URL.createObjectURL(blob);

    // Create an anchor element
    const anchor = document.createElement("a");
    anchor.href = blobUrl; // Set the Blob URL as the href
    anchor.download = fileName; // Set the download attribute with the filename
    document.body.appendChild(anchor); // Append the anchor to the body
    anchor.click(); // Trigger the download
    document.body.removeChild(anchor); // Clean up by removing the anchor
    URL.revokeObjectURL(blobUrl); // Revoke the Blob URL to free memory
  } catch (error) {
    console.error("Error downloading the image:", error);
  }
}

