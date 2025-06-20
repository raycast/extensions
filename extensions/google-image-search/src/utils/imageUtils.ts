import { promises as fs } from "fs";
import path from "path";
import os from "os";
import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { exec } from "child_process";
import axios from "axios";
import { Preferences } from "../types";

// Get download path from Raycast preferences
const { downloadPath } = getPreferenceValues<Preferences>();

// Helper function to get file extension from MIME type
export function getFileExtensionFromMime(mime: string): string {
  const mimeMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
    "image/webp": ".webp",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
    "image/x-icon": ".ico",
  };

  return mimeMap[mime] || ".jpg"; // Default to .jpg if MIME type is not recognized
}

// Helper function to download an image
export async function downloadImage(imageUrl: string, title: string, mime?: string): Promise<string> {
  try {
    // Show a loading toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Downloading image...",
    });

    // Create a unique filename based on title with the correct extension
    const safeTitle = title
      .replace(/[^a-z0-9]/gi, "_")
      .toLowerCase()
      .substring(0, 50);
    const timestamp = new Date().getTime();
    const extension = mime ? getFileExtensionFromMime(mime) : ".jpg";
    const filename = `${safeTitle}_${timestamp}${extension}`;
    const downloadsPath = downloadPath ? downloadPath : path.join(os.homedir(), "Downloads");
    const filePath = path.join(downloadsPath, filename);

    // Fetch the image using axios
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });
    if (response.status !== 200) {
      showFailureToast(`Failed to download image: ${response.statusText}`);
      throw new Error(`Failed to download image: ${response.statusText}`);
    }

    // Convert the response to a buffer
    const buffer = Buffer.from(response.data);

    // Write the buffer to a file
    await fs.writeFile(filePath, buffer);

    // Show success toast
    await showToast({
      style: Toast.Style.Success,
      title: "Image downloaded",
      message: `Saved to Downloads folder as ${filename}`,
    });

    return filePath;
  } catch (error) {
    // Show error toast
    await showToast({
      style: Toast.Style.Failure,
      title: "Download failed",
      message: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }
}

// Helper function to copy image to clipboard
export async function copyImageToClipboard(imageUrl: string): Promise<void> {
  try {
    // Show a loading toast
    await showToast({
      style: Toast.Style.Animated,
      title: "Copying image to clipboard...",
    });

    // Download the image temporarily using axios
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
    });
    if (response.status !== 200) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Get MIME type from headers
    const contentType = response.headers["content-type"] || "image/jpeg";
    const fileExtension = getFileExtensionFromMime(contentType);

    // We'll need to save the image temporarily
    const tempDir = os.tmpdir();
    const tempFile = path.join(tempDir, `raycast_image_${Date.now()}${fileExtension}`);

    // Convert the response to a buffer and save it
    const buffer = Buffer.from(response.data);
    await fs.writeFile(tempFile, buffer);

    // Use a format mapping to determine which AppleScript class to use
    const formatMapping: Record<string, string> = {
      ".png": "«class PNGf»",
      ".jpg": "«class JPEG»",
      ".jpeg": "«class JPEG»",
      ".gif": "«class GIFf»",
      ".tiff": "«class TIFF»",
      ".webp": "«class PNGf»",
    };

    const appleScriptClass = formatMapping[fileExtension] || "«class PNGf»";
    const command = `osascript -e 'set the clipboard to (read (POSIX file "${tempFile}") as ${appleScriptClass})'`;
    exec(command, async (error: Error | null) => {
      // Clean up the temp file
      try {
        await fs.unlink(tempFile);
      } catch (err) {
        console.error("Failed to delete temp file:", err);
      }

      if (error) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to copy image, consider opening the image in the browser CMD+O",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return;
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Image copied to clipboard",
      });
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to copy image, consider opening the image in the browser CMD+O",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

export function getImageType(viewType: string): { fileType: string; colorType: string } {
  let fileType = "";
  let colorType = "";

  switch (viewType) {
    case "all":
      return { fileType: "", colorType: "" };
    case "bmp":
      fileType = "bmp";
      break;
    case "gif":
      fileType = "gif";
      break;
    case "jpeg":
      fileType = "jpeg";
      break;
    case "png":
      fileType = "png";
      break;
    case "webp":
      fileType = "webp";
      break;
    case "svg":
      fileType = "svg";
      break;
    case "avif":
      fileType = "avif";
      break;
    case "color":
      colorType = "color";
      break;
    case "gray":
      colorType = "gray";
      break;
    case "mono":
      colorType = "mono";
      break;
    case "trans":
      colorType = "trans";
      break;
  }
  return { fileType, colorType };
}
