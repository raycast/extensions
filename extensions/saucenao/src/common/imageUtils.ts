import axios from "axios";
import fs from "fs";
import FormData from "form-data";
import { execSync } from "child_process";

// Allowed image MIME types
const ALLOWED_IMAGE_TYPES = ["image/gif", "image/jpeg", "image/png", "image/bmp", "image/webp"];

// Function to check if a file is an image
export const isImageFile = (filePath: string) => {
  const mimeType = execSync(`file --mime-type -b ${filePath}`).toString().trim();
  return ALLOWED_IMAGE_TYPES.includes(mimeType);
};

// Function to check if a URL points to an image by using a HEAD request
export async function isImageURL(url: string) {
  try {
    const response = await axios.get(url, { responseType: "arraybuffer" });

    const contentType = response.headers["content-type"];
    console.log("Content-Type of URL:", contentType);

    return contentType && ALLOWED_IMAGE_TYPES.includes(contentType);
  } catch (error) {
    console.error("Failed to check URL content type", error);
    return false;
  }
}

// Upload image to File.io using form-data
export async function uploadToFileIo(imagePath: string) {
  const form = new FormData();
  form.append("file", fs.createReadStream(imagePath));

  try {
    const response = await axios.post("https://file.io", form, {
      headers: form.getHeaders(),
    });

    console.log("Uploaded to File.io, response:", response.data);
    return response.data.link; // The URL where the image can be accessed
  } catch (error) {
    console.error("Failed to upload image to File.io", error);
    throw new Error("Image upload failed");
  }
}

// Perform reverse image search on SauceNAO
export async function searchImage(apiKey: string, imageUrl: string) {
  return `https://saucenao.com/search.php?db=999&url=${encodeURIComponent(imageUrl)}&api_key=${apiKey}`;
}
