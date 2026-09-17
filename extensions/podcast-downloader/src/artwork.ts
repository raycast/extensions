import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { environment } from "@raycast/api";
import { safeFetch } from "./network";

const MAX_ARTWORK_BYTES = 5 * 1024 * 1024;
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CONCURRENT_DOWNLOADS = 4;
const extensions = new Map([
  ["image/gif", ".gif"],
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const pending = new Map<string, Promise<string | undefined>>();
const queue: (() => void)[] = [];
let activeDownloads = 0;

export function cacheArtwork(url?: string): Promise<string | undefined> {
  if (!url) return Promise.resolve(undefined);
  const existing = pending.get(url);
  if (existing) return existing;
  const request = withDownloadSlot(() => downloadArtwork(url)).finally(() =>
    pending.delete(url),
  );
  pending.set(url, request);
  return request;
}

async function downloadArtwork(url: string): Promise<string | undefined> {
  try {
    const directory = path.join(environment.supportPath, "artwork");
    const key = crypto.createHash("sha256").update(url).digest("hex");
    await fs.mkdir(directory, { recursive: true });
    const cached = await findFreshCacheEntry(directory, key);
    if (cached) return pathToFileURL(cached).toString();

    const response = await safeFetch(url, {
      headers: { "User-Agent": "Raycast-Podcast-Downloader/1.0" },
    });
    if (!response.ok || !response.body) return undefined;
    const contentType = response.headers
      .get("content-type")
      ?.split(";", 1)[0]
      .trim()
      .toLowerCase();
    const extension = contentType && extensions.get(contentType);
    if (!extension) return undefined;
    const declaredLength = Number(response.headers.get("content-length"));
    if (declaredLength > MAX_ARTWORK_BYTES) return undefined;

    const bytes = await readLimited(response.body);
    if (!hasExpectedSignature(bytes, contentType)) return undefined;
    const target = path.join(directory, `${key}${extension}`);
    const temporary = `${target}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, bytes, { flag: "wx" });
    await fs.rename(temporary, target);
    return pathToFileURL(target).toString();
  } catch {
    return undefined;
  }
}

function hasExpectedSignature(bytes: Buffer, contentType: string): boolean {
  switch (contentType) {
    case "image/gif":
      return (
        bytes.subarray(0, 6).toString("ascii") === "GIF87a" ||
        bytes.subarray(0, 6).toString("ascii") === "GIF89a"
      );
    case "image/jpeg":
      return (
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff
      );
    case "image/png":
      return bytes
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/webp":
      return (
        bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
        bytes.subarray(8, 12).toString("ascii") === "WEBP"
      );
    default:
      return false;
  }
}

async function findFreshCacheEntry(
  directory: string,
  key: string,
): Promise<string | undefined> {
  for (const extension of extensions.values()) {
    const candidate = path.join(directory, `${key}${extension}`);
    try {
      const stats = await fs.stat(candidate);
      if (Date.now() - stats.mtimeMs <= CACHE_MAX_AGE_MS) return candidate;
    } catch {
      // Cache miss.
    }
  }
  return undefined;
}

async function readLimited(
  stream: ReadableStream<Uint8Array>,
): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > MAX_ARTWORK_BYTES)
        throw new Error("Artwork exceeds the size limit.");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, length);
}

async function withDownloadSlot<T>(operation: () => Promise<T>): Promise<T> {
  if (activeDownloads >= MAX_CONCURRENT_DOWNLOADS) {
    await new Promise<void>((resolve) => queue.push(resolve));
  }
  activeDownloads += 1;
  try {
    return await operation();
  } finally {
    activeDownloads -= 1;
    queue.shift()?.();
  }
}
