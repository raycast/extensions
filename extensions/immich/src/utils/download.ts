import { Cache, Clipboard, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { runPowerShellScript } from "@raycast/utils";
import { existsSync } from "node:fs";
import { realpath, writeFile } from "node:fs/promises";
import { homedir, platform, tmpdir } from "node:os";
import { join } from "node:path";

const WINDOWS_REG_DOWNLOAD_KEY = String.raw`HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders`;
const WINDOWS_REG_DOWNLOAD_VALUE = "{374DE290-123F-4565-9164-39C4925E467B}";
const WINDOWS_REG_DOWNLOAD_CACHE_TTL = 1000 * 60 * 60; // 1 hour

const cache = new Cache();

/**
 * Attempts to read the user's Downloads folder path from the Windows registry (in case user has moved it).
 * Caches the result to avoid repeated registry reads (takes about 250ms on my machine).
 * Cache expires after 1 hour
 * @returns The path to the Downloads folder, or null if it cannot be determined.
 */
async function windowsGetDownloadFolder() {
  const cacheExpired = cache.has("download_folder_fetch_timestamp")
    ? Date.now() - parseInt(cache.get("download_folder_fetch_timestamp") || "0") > WINDOWS_REG_DOWNLOAD_CACHE_TTL
    : true;

  if (!cacheExpired && cache.has("download_folder")) {
    return cache.get("download_folder") || null;
  }

  const path = await runPowerShellScript(
    `[Environment]::ExpandEnvironmentVariables((Get-ItemProperty -Path "${WINDOWS_REG_DOWNLOAD_KEY}")."${WINDOWS_REG_DOWNLOAD_VALUE}")`,
    { timeout: 2000 },
  )
    .then((p) => p.trim())
    .catch(() => null);

  if (path && existsSync(path)) {
    const realPath = await realpath(path);
    cache.set("download_folder", realPath);
    cache.set("download_folder_fetch_timestamp", Date.now().toString());
    return realPath;
  }

  cache.set("download_folder", "");
  cache.set("download_folder_fetch_timestamp", Date.now().toString());
  return null;
}

/**
 * Gets the path to the user's Downloads folder path
 * On Windows, it attempts to read the Downloads folder path from the registry to support custom locations.
 * Defaults to ~/Downloads
 * @returns The path to the Downloads folder.
 */
async function getDownloadFolderPath() {
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.download_folder) {
    return preferences.download_folder;
  }

  if (platform() === "win32") {
    const path = await windowsGetDownloadFolder();
    if (path) {
      return path;
    }
  }

  return join(homedir(), "Downloads");
}

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
    const path = join(await getDownloadFolderPath(), safeFileName(filename));
    await fetchFileToDisk(path, url, (percent) => {
      toast.message = `${percent}%`;
    });
    // New toast because the progress callback can overwrite the path
    await showToast(Toast.Style.Success, "Download complete", path);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Download failed";
    toast.message = `${error}`;
  }
}
