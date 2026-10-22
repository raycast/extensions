import fs from "node:fs/promises";
import { constants } from "node:fs";
import { generatedImageUrl } from "./search-model";

// Double base64 encoding stays below 1 MiB. Larger files use Raycast's
// local-file renderer instead of copying the image into detail markdown.
export const MAX_INLINE_BYTES = 512 * 1024;
// OS filesystem operations cannot reliably be interrupted once submitted.
// Hold this slot until the operation and handle cleanup actually finish.
// Other selections use the native URL immediately; never queue more reads.
let roundingActive = false;

export function nativePreviewUrl(path: string): string | undefined {
  return generatedImageUrl({ original_file: path, filename: path, generated_file: path });
}

async function previewUrl(path: string, signal: AbortSignal): Promise<string | undefined> {
  const original = nativePreviewUrl(path);
  if (!original) return undefined;
  signal.throwIfAborted();
  const info = await fs.stat(path);
  signal.throwIfAborted();
  if (!info.isFile()) return undefined;
  await fs.access(path, constants.R_OK);
  signal.throwIfAborted();
  if (info.size > MAX_INLINE_BYTES) return original;

  const file = await fs.open(path, "r");
  let data: Buffer;
  try {
    signal.throwIfAborted();
    // A bounded read also handles files that grow after stat().
    const buffer = Buffer.alloc(MAX_INLINE_BYTES + 1);
    let length = 0;
    while (length < buffer.length) {
      signal.throwIfAborted();
      const { bytesRead } = await file.read(buffer, length, buffer.length - length, length);
      if (!bytesRead) break;
      length += bytesRead;
    }
    data = buffer.subarray(0, length);
  } finally {
    await file.close();
  }
  signal.throwIfAborted();
  if (data.length > MAX_INLINE_BYTES) return original;
  const { imageDimensionsFromData } = await import("image-dimensions");
  const dimensions = imageDimensionsFromData(data);
  if (!dimensions) return original;
  const { width, height, type } = dimensions;
  const mime = {
    png: "image/png",
    jpeg: "image/jpeg",
    webp: "image/webp",
    gif: "image/gif",
    avif: undefined,
    heic: undefined,
  }[type];
  // Let Raycast preserve orientation for EXIF/HEIF images.
  if (!mime || !width || !height || data.includes(Buffer.from("Exif\0\0"))) return original;
  const displayWidth = 320;
  const displayHeight = (height / width) * displayWidth;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${displayWidth}" height="${displayHeight}" viewBox="0 0 ${displayWidth} ${displayHeight}">
  <defs><clipPath id="corners"><rect width="${displayWidth}" height="${displayHeight}" rx="12"/></clipPath></defs>
  <image width="${displayWidth}" height="${displayHeight}" href="data:${mime};base64,${data.toString("base64")}" clip-path="url(#corners)"/>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export async function loadPreview(path: string, signal: AbortSignal): Promise<string | undefined> {
  signal.throwIfAborted();
  const original = nativePreviewUrl(path);
  if (!original || roundingActive) return original;
  roundingActive = true;
  try {
    return await previewUrl(path, signal);
  } finally {
    roundingActive = false;
  }
}
