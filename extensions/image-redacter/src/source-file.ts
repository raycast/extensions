import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

export const PDF_MIME_TYPE = "application/pdf";

const MIME_TYPES: Record<string, string> = {
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": PDF_MIME_TYPE,
  ".png": "image/png",
  ".webp": "image/webp",
};

export function sourceMimeType(path: string): string | undefined {
  return MIME_TYPES[extname(path).toLowerCase()];
}

export function clipboardFilePath(value: string): string {
  return value.startsWith("file://") ? fileURLToPath(value) : value;
}

export async function validateSource(path: string): Promise<string> {
  if (!path) throw new Error("Choose an image or PDF first.");

  const mimeType = sourceMimeType(path);
  if (!mimeType) {
    throw new Error(
      "Choose a PDF or a PNG, JPEG, WebP, GIF, BMP, or AVIF image. Convert HEIC or TIFF images to PNG or JPEG first.",
    );
  }

  let details;
  try {
    details = await stat(path);
  } catch {
    throw new Error("The selected file no longer exists.");
  }

  if (!details.isFile()) throw new Error("Choose a file, not a folder.");
  return mimeType;
}

/** Identifies a file by its contents, so renamed copies count as the same file. */
export async function fingerprintFile(path: string): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

export async function countPdfPages(path: string): Promise<number> {
  try {
    const document = await PDFDocument.load(await readFile(path), {
      ignoreEncryption: true,
      updateMetadata: false,
    });
    return document.getPageCount();
  } catch {
    throw new Error("This PDF is damaged or password-protected.");
  }
}
