import { existsSync } from "node:fs";
import { basename } from "node:path";
import { showToast, Toast, Clipboard, showHUD } from "@raycast/api";
import type { Preferences, UploadResponse } from "./types";

/**
 * Validates if the provided preferences are complete
 * @param preferences The user preferences
 * @returns True if preferences are valid, false otherwise
 */
export async function validatePreferences(preferences: Preferences): Promise<boolean> {
  if (!preferences.apiKey || !preferences.uploadUrl) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Missing configuration",
      message: "Please set your API key and Chibisafe URL in the extension preferences",
    });
    return false;
  }
  return true;
}

/**
 * Validates if the file exists at the given path
 * @param filePath Path to the file
 * @returns True if file exists, false otherwise
 */
export async function validateFile(filePath: string): Promise<boolean> {
  if (!existsSync(filePath)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "File not found",
      message: `The file ${filePath} does not exist`,
    });
    return false;
  }
  return true;
}

/**
 * Shows a toast indicating that no file is selected
 */
export async function showNoFileSelectedToast(): Promise<void> {
  await showToast({
    style: Toast.Style.Failure,
    title: "No file selected",
    message: "Please select a file in Finder",
  });
}

/**
 * Shows an uploading toast with the file name
 * @param filePath Path to the file being uploaded
 * @returns The toast instance
 */
export async function showUploadingToast(filePath: string): Promise<Toast> {
  return await showToast({
    style: Toast.Style.Animated,
    title: "Uploading file",
    message: basename(filePath),
  });
}

/**
 * Uploads a file to Chibisafe
 * @param filePath Path to the file to upload
 * @param preferences User preferences containing API key and upload URL
 * @returns The upload response
 */
export async function uploadFile(filePath: string, preferences: Preferences): Promise<UploadResponse> {
  // Import these modules dynamically to avoid TypeScript errors
  const { FormData } = await import("formdata-node");
  const { fileFromPath } = await import("formdata-node/file-from-path");
  const fetch = (await import("node-fetch")).default;

  // Create form data
  const formData = new FormData();
  const file = await fileFromPath(filePath);
  formData.append("file", file);

  // Upload file
  const response = await fetch(preferences.uploadUrl, {
    method: "POST",
    headers: {
      "x-api-key": preferences.apiKey,
    },
    // @ts-expect-error - FormData type mismatch between formdata-node and node-fetch
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed with status ${response.status}: ${await response.text()}`);
  }

  const result = (await response.json()) as UploadResponse;

  if (!result.url) {
    throw new Error("Upload succeeded but no URL was returned");
  }

  return result;
}

/**
 * Handles successful upload by copying URL to clipboard and showing notifications
 * @param url The URL to copy to clipboard
 * @param toast The toast to update
 */
export async function handleSuccessfulUpload(url: string, toast: Toast): Promise<void> {
  // Copy URL to clipboard
  await Clipboard.copy(url);

  // Show success toast
  toast.style = Toast.Style.Success;
  toast.title = "Upload successful";
  toast.message = "URL copied to clipboard";

  // Also show HUD for confirmation
  await showHUD("File uploaded ✓ URL copied to clipboard");
}

/**
 * Handles errors during the upload process
 * @param error The error that occurred
 */
export async function handleError(error: unknown): Promise<void> {
  // Using console.error for logging
  console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);

  await showToast({
    style: Toast.Style.Failure,
    title: "Upload failed",
    message: error instanceof Error ? error.message : String(error),
  });
}
