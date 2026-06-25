import { Clipboard } from "@raycast/api";
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";

const IMAGE_EXT_TO_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export class ClipboardImageError extends Error {
  constructor(
    public readonly kind: "empty" | "unsupported",
    message: string,
  ) {
    super(message);
    this.name = "ClipboardImageError";
  }
}

export function mimeTypeForImagePath(filePath: string): string | undefined {
  const ext = extname(filePath).toLowerCase();
  return IMAGE_EXT_TO_MIME[ext];
}

function fileExtensionForMediaType(mediaType: string): string {
  switch (mediaType) {
    case "image/jpeg":
      return ".jpg";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/png":
    default:
      return ".png";
  }
}

export { fileExtensionForMediaType };

/**
 * Reads an image from the clipboard (file-backed pasteboard content on macOS).
 * Pure image data without a file path is not supported.
 */
export async function readImageFromClipboard(): Promise<{ base64: string; mediaType: string }> {
  const { file, text } = await Clipboard.read();
  const trimmedFile = typeof file === "string" ? file.trim() : "";
  const textMaybePath = typeof text === "string" && text.trim().startsWith("/") ? text.trim() : "";

  const pathToTry = trimmedFile || textMaybePath;
  if (!pathToTry || !existsSync(pathToTry)) {
    throw new ClipboardImageError(
      "empty",
      "No image file on the clipboard. Copy an image file or use macOS screenshot (e.g. region to file), then copy the file, or paste an image that exposes a file path.",
    );
  }

  const mediaType = mimeTypeForImagePath(pathToTry);
  if (!mediaType) {
    throw new ClipboardImageError(
      "unsupported",
      "Clipboard file is not a supported image type (PNG, JPEG, WebP, or GIF).",
    );
  }

  const buf = readFileSync(pathToTry);
  if (!buf.length) {
    throw new ClipboardImageError("empty", "Clipboard image file is empty.");
  }

  return { base64: buf.toString("base64"), mediaType };
}
