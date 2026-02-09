import { writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const MEDIA_EXTENSION_REGEX =
  /\.(png|jpe?g|webp|gif|bmp|tiff?|heic|heif|avif|mp4|mov|webm|m4v|mp3|wav|flac|aac|ogg)(\?|$)/i;

function isUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function collectUrls(value: unknown, urls: string[]) {
  if (typeof value === "string") {
    if (isUrl(value)) {
      urls.push(value);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectUrls(item, urls);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      collectUrls(nested, urls);
    }
  }
}

function extensionFromContentType(contentType: string | null) {
  if (!contentType) return ".bin";
  const type = contentType.toLowerCase();
  if (type.includes("image/png")) return ".png";
  if (type.includes("image/jpeg")) return ".jpg";
  if (type.includes("image/webp")) return ".webp";
  if (type.includes("image/gif")) return ".gif";
  if (type.includes("video/mp4")) return ".mp4";
  if (type.includes("video/webm")) return ".webm";
  if (type.includes("audio/mpeg")) return ".mp3";
  if (type.includes("audio/wav")) return ".wav";
  return ".bin";
}

function extensionFromUrl(url: string) {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname);
    if (!ext) return undefined;
    return ext;
  } catch {
    return undefined;
  }
}

export function findBestFileUrl(result: unknown) {
  const urls: string[] = [];
  collectUrls(result, urls);
  if (urls.length === 0) return undefined;

  const mediaUrl = urls.find((url) => MEDIA_EXTENSION_REGEX.test(url));
  return mediaUrl || urls[0];
}

export async function downloadResultFile(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file (${response.status})`);
  }

  const bytes = Buffer.from(await response.arrayBuffer());
  const extension =
    extensionFromUrl(url) ||
    extensionFromContentType(response.headers.get("content-type"));
  const filename = `fal-result-${Date.now()}${extension}`;
  const filePath = path.join(os.tmpdir(), filename);

  await writeFile(filePath, bytes);
  return filePath;
}
