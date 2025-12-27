import { Clipboard } from "@raycast/api";
import fs from "node:fs/promises";
import path from "node:path";

export type ClipboardImage = {
  sourcePath: string;
  data: Buffer;
  filename: string;
  extension: string;
};

/**
 * Read image file from clipboard.
 * Returns null if no image file is found in clipboard.
 */
export async function readClipboardImageFile(): Promise<ClipboardImage | null> {
  const content = await Clipboard.read();
  const file = content.file;

  if (!file) {
    return null;
  }

  // Convert PathLike to string
  let filePath = String(file);

  // Handle URL encoding
  try {
    filePath = decodeURIComponent(filePath);
  } catch {
    // Ignore decode errors
  }

  // Remove file:// prefix if present
  if (filePath.startsWith("file://")) {
    filePath = filePath.slice("file://".length);
  }

  // Check if file exists and read it
  try {
    const data = await fs.readFile(filePath);
    if (!data || data.length === 0) {
      return null;
    }

    const filename = path.basename(filePath);
    const extension = path.extname(filePath).toLowerCase().slice(1) || "png";

    return {
      sourcePath: filePath,
      data,
      filename,
      extension,
    };
  } catch {
    return null;
  }
}

/**
 * Detect content type from file extension
 */
export function getContentType(extension: string): string {
  const types: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    bmp: "image/bmp",
    ico: "image/x-icon",
  };
  return types[extension.toLowerCase()] || "application/octet-stream";
}
