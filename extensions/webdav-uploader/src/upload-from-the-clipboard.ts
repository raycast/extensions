import { Clipboard, getPreferenceValues, showToast, Toast } from "@raycast/api";
import { createClient } from "webdav";
import * as fs from "fs";
import * as path from "path";

/**
 * Reads the clipboard using Raycast's Clipboard API.
 * It verifies that a file is present (and not text, HTML, or empty).
 */
async function getClipboardFilePath(): Promise<string> {
  const clipboardContent = await Clipboard.read();
  if (clipboardContent.file && typeof clipboardContent.file === "string" && clipboardContent.file.trim() !== "") {
    let filePath = clipboardContent.file.trim();
    if (filePath.startsWith("file://")) {
      // Convert file URL to local path
      filePath = decodeURIComponent(new URL(filePath).pathname);
    }
    return filePath;
  }
  throw new Error("Clipboard does not contain a valid file. Please copy exactly one file.");
}

/**
 * Uploads a local file to WebDAV.
 * The file is stored under `basedir/year/month/filename`. If the file exists,
 * a counter (e.g. filename-1.txt) is appended until an unused name is found.
 */
async function uploadFile(localFilePath: string, preferences: Preferences): Promise<string> {
  // Verify that the local path exists and is a file.
  const stats = await fs.promises.stat(localFilePath);
  if (!stats.isFile()) {
    throw new Error("The clipboard item is not a file.");
  }

  // Create the WebDAV client.
  const client = createClient(preferences.webdavUrl, {
    username: preferences.username,
    password: preferences.password,
  });

  // Build the remote directory path: basedir/year/month.
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const remoteDir = [preferences.baseDir.replace(/\/+$/, ""), year, month].join("/");

  // Ensure the remote directory exists.
  if (!(await client.exists(remoteDir))) {
    await client.createDirectory(remoteDir, { recursive: true });
  }

  // Determine the target file name and handle naming collisions.
  const fileName = path.basename(localFilePath);
  const parsed = path.parse(fileName);
  let remoteFileName = fileName;
  let remoteFilePath = `${remoteDir}/${remoteFileName}`;
  let counter = 1;

  while (await client.exists(remoteFilePath)) {
    remoteFileName = `${parsed.name}-${counter}${parsed.ext}`;
    remoteFilePath = `${remoteDir}/${remoteFileName}`;
    counter++;
  }

  // Read the file content.
  const fileBuffer = await fs.promises.readFile(localFilePath);

  // Upload the file.
  await client.putFileContents(remoteFilePath, fileBuffer);

  return remoteFilePath;
}

/**
 * Main entry point of the Raycast extension.
 */
export default async function main() {
  try {
    // Retrieve extension preferences.
    const preferences = getPreferenceValues<Preferences>();

    // Get the file path from the clipboard.
    const filePath = await getClipboardFilePath();

    // Upload the file to WebDAV.
    const remotePath = await uploadFile(filePath, preferences);

    // Construct the full URL using the base URL and the remote path.
    const fileUrl = new URL(remotePath, preferences.webdavUrl).toString();

    // Copy the file URL to the clipboard.
    await Clipboard.copy(fileUrl);

    await showToast(Toast.Style.Success, "File uploaded", `Remote URL copied to clipboard:\n${fileUrl}`);
  } catch (error: unknown) {
    let message = "Unknown error";
    if (error instanceof Error) {
      message = error.message;
    } else {
      message = String(error);
    }
    await showToast(Toast.Style.Failure, "Upload failed", message);
  }
}
