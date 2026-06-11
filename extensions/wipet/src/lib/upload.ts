import { readFile, stat } from "node:fs/promises";
import { extname, basename } from "node:path";
import { presignUploads, type UploadedImage } from "./api";

export const MAX_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGES = 3;

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export type LocalImage = { path: string; sizeBytes: number; mimeType: string };

export async function inspectFile(path: string): Promise<LocalImage> {
  const ext = extname(path).toLowerCase();
  const mimeType = MIME_BY_EXT[ext];
  if (!mimeType) {
    throw new Error(`${basename(path)}: unsupported file type (${ext || "no extension"})`);
  }
  const st = await stat(path);
  if (!st.isFile()) throw new Error(`${basename(path)}: not a file`);
  if (st.size > MAX_BYTES) {
    throw new Error(`${basename(path)}: too large (max ${Math.round(MAX_BYTES / 1024 / 1024)}MB)`);
  }
  return { path, sizeBytes: st.size, mimeType };
}

export async function uploadFiles(images: LocalImage[]): Promise<UploadedImage[]> {
  if (images.length === 0) return [];
  if (images.length > MAX_IMAGES) {
    throw new Error(`Too many images (max ${MAX_IMAGES})`);
  }

  const uploads = await presignUploads(images.map((i) => ({ mimeType: i.mimeType, sizeBytes: i.sizeBytes })));

  await Promise.all(
    uploads.map(async (u, i) => {
      const file = images[i];
      const body = await readFile(file.path);
      const res = await fetch(u.uploadUrl, {
        method: "PUT",
        headers: { "content-type": file.mimeType },
        body,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(`Upload failed for ${basename(file.path)}: ${txt || res.statusText}`);
      }
    }),
  );

  return uploads.map((u) => ({
    key: u.key,
    mimeType: u.mimeType,
    sizeBytes: u.sizeBytes,
  }));
}
