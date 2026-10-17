import { Clipboard } from "@raycast/api";
import { existsSync, readFileSync } from "fs";

function isImageFile(path: string): boolean {
  const lower = path.toLowerCase();
  return [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".tiff",
    ".tif",
    ".bmp",
  ].some((ext) => lower.endsWith(ext));
}

function readImageBase64FromFile(path: string): string | undefined {
  if (!existsSync(path)) {
    return undefined;
  }
  return readFileSync(path).toString("base64");
}

/**
 * Raycast's Clipboard API exposes file paths and text, not raw image bytes.
 * Screenshots and "Copy Image" put PNG/TIFF on the pasteboard, which the Swift bridge reads.
 */
export async function readClipboardImageBase64(): Promise<string | undefined> {
  const { file, text } = await Clipboard.read();
  const imagePath =
    file && isImageFile(file)
      ? file
      : text && isImageFile(text)
        ? text
        : undefined;

  if (imagePath) {
    const fromFile = readImageBase64FromFile(imagePath);
    if (fromFile) {
      return fromFile;
    }
  }

  const { readClipboardImage } = await import("swift:../swift/simple-draw");
  return (await readClipboardImage()) ?? undefined;
}
