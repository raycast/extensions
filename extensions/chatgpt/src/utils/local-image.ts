import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

export const MAX_INLINE_IMAGE_BYTES = 8 * 1024 * 1024;

function resolveImagePath(imagePath: string) {
  return imagePath.startsWith("file://") ? fileURLToPath(imagePath) : path.resolve(imagePath);
}

export async function readLocalImage(imagePath: string, maxBytes: number, headerOnly = false) {
  const localPath = resolveImagePath(imagePath);
  const file = await fs.open(localPath, "r");
  try {
    const stats = await file.stat();
    if (!stats.isFile()) throw new Error("Select an image file.");
    const { size } = stats;
    if (!headerOnly && size > maxBytes) {
      throw new Error(
        "Image attachments exceed the 8 MB limit for API key requests. Use smaller images or sign in with ChatGPT.",
      );
    }
    const buffer = Buffer.alloc(Math.min(size, maxBytes));
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await file.read(buffer, offset, buffer.length - offset);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    return { data: buffer.subarray(0, offset), size, path: localPath };
  } finally {
    await file.close();
  }
}

export async function localImageTurnInput(imagePath: string): Promise<{ type: "localImage"; path: string }> {
  const localPath = resolveImagePath(imagePath);
  if (!(await fs.stat(localPath)).isFile()) throw new Error(`Image path is not a file: ${localPath}`);
  return { type: "localImage", path: localPath };
}
