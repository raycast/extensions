import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { writeFile, realpath } from "node:fs/promises";

/**
 * Fetches a file from a URL and writes it to the specified file path on disk.
 * @param filePath The path on disk where the file will be saved.
 * @param url The URL to fetch the file from.
 * @param onProgress Optional callback to report download progress as a percentage.
 */
async function fetchFileToDisk(filePath: string, url: string, onProgress?: (percent: number) => void) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
  }

  if (!res.body) {
    throw new Error("Response body is null");
  }

  const fileSizeBytes = parseInt(res.headers.get("Content-Length") || "0");
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let downloadedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    chunks.push(value);
    if (fileSizeBytes > 0 && onProgress) {
      downloadedBytes += value.length;
      onProgress(Math.round((downloadedBytes / fileSizeBytes) * 100));
    }
  }

  const buffer = Buffer.concat(chunks);
  await writeFile(filePath, buffer);
}

/**
 * Sanitizes a filename by removing any path components.
 * @param name - The original filename.
 * @returns The sanitized filename.
 */
const safeFileName = (name: string) => name.replace(/^.*[\\/]/, "");

/**
 * Downloads an image from a URL, saves it into the OS' temp folder and copies it to the clipboard.
 * @param url - The URL of the image to download.
 * @param filename - The filename to use for the temporary file.
 */
export async function downloadAndCopyImage(url: string, filename: string) {
  const toast = await showToast(Toast.Style.Animated, "Downloading image", "Please wait...");

  try {
    const path = join(await realpath(tmpdir()), safeFileName(filename));
    await fetchFileToDisk(path, url, (percent) => {
      toast.message = `${percent}%`;
    });
    await Clipboard.copy({ file: path });
    await showHUD("Image copied to clipboard");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Download failed";
    toast.message = `${error}`;
  }
}

/**
 * Downloads an image from a URL and saves it to the user's Downloads folder.
 * @param url - The URL of the image to download.
 * @param filename - The filename to use for the downloaded file.
 */
export async function downloadImageToDownloads(url: string, filename: string) {
  const toast = await showToast(Toast.Style.Animated, "Downloading image", "Please wait...");

  try {
    const path = join(homedir(), "Downloads", safeFileName(filename));
    await fetchFileToDisk(path, url, (percent) => {
      toast.message = `${percent}%`;
    });
    // New toast to because the progress callback can overwrite the path
    await showToast(Toast.Style.Success, "Download complete", path);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Download failed";
    toast.message = `${error}`;
  }
}
