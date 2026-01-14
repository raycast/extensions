import { Clipboard, showHUD, showToast, Toast } from "@raycast/api";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { writeFile, realpath } from "node:fs/promises";

/**
 * Fetches a file from a URL and writes it to the specified file path on disk.
 * @param filePath The path on disk where the file will be saved.
 * @param url The URL to fetch the file from.
 */
async function fetchFileToDisk(filePath: string, url: string) {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`);
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  await writeFile(filePath, buffer);
}

/**
 * Downloads an image from a URL, saves it into the OS' temp folder and copies it to the clipboard.
 * @param url - The URL of the image to download.
 * @param filename - The filename to use for the temporary file.
 */
export async function downloadAndCopyImage(url: string, filename: string) {
  try {
    const path = join(await realpath(tmpdir()), filename);
    await showToast(Toast.Style.Animated, "Downloading image", "Please wait...");
    await fetchFileToDisk(path, url);
    await Clipboard.copy({ file: path });
    await showHUD("Image copied to clipboard");
  } catch (error) {
    await showToast(Toast.Style.Failure, "Download failed", `${error}`);
  }
}

/**
 * Downloads an image from a URL and saves it to the user's Downloads folder.
 * @param url - The URL of the image to download.
 * @param filename - The filename to use for the downloaded file.
 */
export async function downloadImageToDownloads(url: string, filename: string) {
  try {
    const path = join(homedir(), "Downloads", filename);
    await showToast(Toast.Style.Animated, "Downloading image", "Please wait...");
    await fetchFileToDisk(path, url);
    await showToast(Toast.Style.Success, "Download complete", path);
  } catch (error) {
    await showToast(Toast.Style.Failure, "Download failed", `${error}`);
  }
}
