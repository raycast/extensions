import { Clipboard, showToast, Toast, open, getPreferenceValues } from "@raycast/api";
import { uploadToFileIo, searchImage, isImageFile, isImageURL } from "./common/imageUtils";
import { execSync } from "child_process";
import fs from "fs";

// Function to get image from the clipboard
async function getClipboardImage() {
  try {
    const tempImagePath = "/tmp/clipboard.png";

    // Save the clipboard image to a temp file
    execSync(`osascript -e 'the clipboard as «class PNGf»' | sed 's/^«data PNGf//' | xxd -r -p > ${tempImagePath}`);

    // Check if the image file exists and is a valid image
    if (fs.existsSync(tempImagePath) && isImageFile(tempImagePath)) {
      console.log("Image found in clipboard.");
      return tempImagePath;
    } else {
      console.log("No valid image found in clipboard temp path.");
    }
  } catch (error) {
    console.error("Failed to get image from clipboard", error);
  }

  return null;
}

// Function to get a valid image URL from the clipboard
export async function getClipboardURL() {
  const clipboardContent = await Clipboard.readText();

  if (clipboardContent) {
    console.log("Clipboard content:", clipboardContent);
    try {
      const url = new URL(clipboardContent.trim());

      // Check if URL points to an image by analyzing Content-Type
      const isImage = await isImageURL(url.toString());
      if (isImage) {
        console.log("Detected image URL:", url.toString());
        return url.toString(); // Return valid image URL
      } else {
        console.log("URL is not a valid image type.");
        return null; // Return null explicitly for unsupported types
      }
    } catch (error) {
      console.log("Clipboard content is not a valid URL or image.");
    }
  }

  return null;
}

export default async function main() {
  const { apiKey } = getPreferenceValues<ExtensionPreferences>();

  // Step 1: Check for an image in the clipboard
  console.log("Checking clipboard for an image...");
  const imagePath = await getClipboardImage();
  if (imagePath) {
    try {
      // Upload the image to File.io
      const fileIoUrl = await uploadToFileIo(imagePath);
      await showToast(Toast.Style.Success, "Image uploaded to File.io");

      // Search the image on SauceNAO using the File.io URL
      const searchUrl = await searchImage(apiKey, fileIoUrl);

      // Open the SauceNAO results in the default browser
      await showToast(Toast.Style.Success, "Opening SauceNAO results...");
      await open(searchUrl);
      return; // Stop execution after opening SauceNAO results
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to upload image.");
      console.error(error);
      return; // Stop execution on upload failure
    }
  }

  // Step 2: If no image found, check for a valid image URL in the clipboard
  console.log("No image found in clipboard. Checking for valid image URL...");
  const clipboardUrl = await getClipboardURL();
  if (clipboardUrl) {
    // If a valid image URL is found, use it directly for SauceNAO search
    try {
      const searchUrl = await searchImage(apiKey, clipboardUrl);
      await showToast(Toast.Style.Success, "Using image URL from clipboard, opening SauceNAO results...");
      await open(searchUrl);
      return; // Stop execution here if a valid image URL was found
    } catch (error) {
      await showToast(Toast.Style.Failure, "Failed to search for image.");
      console.error(error);
      return; // Stop execution on search failure
    }
  }

  // If no valid image URL or image found in clipboard
  await showToast(Toast.Style.Failure, "No valid image found in clipboard.");
}
