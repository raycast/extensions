import { showToast, Toast, Clipboard } from "@raycast/api";
import fs from "fs";
import { uploadFile } from "./shared/upload";

async function getClipboardFilePath(): Promise<string | null> {
  function normalizeFilePath(filePath: string): string {
    // Remove file:// protocol if present
    let normalizedPath = filePath.replace(/^file:\/\//, "");

    // Decode URL-encoded characters
    normalizedPath = decodeURIComponent(normalizedPath);

    return normalizedPath;
  }

  // Try clipboard for file path text
  const clipboardText = await Clipboard.readText();

  if (clipboardText) {
    const normalizedPath = normalizeFilePath(clipboardText);

    // Check if it's a valid file path
    if (fs.existsSync(normalizedPath) && fs.statSync(normalizedPath).isFile()) {
      return normalizedPath;
    }
  }

  // Try clipboard for copied file
  const clipboardFile = await Clipboard.read();

  if (clipboardFile.file) {
    const normalizedPath = normalizeFilePath(clipboardFile.file);

    if (fs.existsSync(normalizedPath)) {
      return normalizedPath;
    }
  }

  return null;
}

export default async function Command() {
  const filePath = await getClipboardFilePath();

  try {
    if (!filePath) {
      await showToast({ title: "No file found on clipboard", style: Toast.Style.Failure });
      return;
    }

    await uploadFile(filePath);
  } catch (error) {
    await showToast({
      title: "Error getting file from clipboard",
      message: error instanceof Error ? error.message : String(error),
      style: Toast.Style.Failure,
    });
  }
}
