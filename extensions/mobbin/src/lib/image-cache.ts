import { Clipboard, environment } from "@raycast/api";
import { createHash } from "node:crypto";
import {
  access,
  copyFile,
  mkdir,
  readdir,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  MobbinError,
  abortError,
  getErrorMessage,
  isAbortError,
} from "./errors";
import { createTimeoutSignal, waitForAbortable } from "./request";
import type { ImageReference, MobbinReference, ReferenceImage } from "./types";

const CACHE_DIR = path.join(environment.supportPath, "images", "cache");
const FAVORITES_DIR = path.join(environment.supportPath, "images", "favorites");
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const IMAGE_TIMEOUT_MS = 30_000;
const MAX_CACHE_FILES = 200;
const CACHE_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const PRUNE_INTERVAL_MS = 5 * 60 * 1000;
type CacheableImageReference = {
  kind: MobbinReference["kind"];
  id: string;
  appName: string;
  image: ReferenceImage;
};

type InFlightImage = {
  controller: AbortController;
  consumers: Set<symbol>;
  promise: Promise<string>;
};

const inFlightImages = new Map<string, InFlightImage>();
let lastPrunedAt = 0;

function extensionFromContentType(contentType: string): string {
  const normalized = contentType.toLowerCase();
  if (normalized.includes("webp")) return "webp";
  if (normalized.includes("jpeg") || normalized.includes("jpg")) return "jpg";
  if (normalized.includes("gif")) return "gif";
  if (normalized.includes("avif")) return "avif";
  if (normalized.includes("svg")) return "svg";
  if (normalized.includes("tiff")) return "tiff";
  if (normalized.includes("bmp")) return "bmp";
  if (normalized.includes("icon")) return "ico";
  return "png";
}

function canonicalImageIdentity(reference: CacheableImageReference): string {
  const source = reference.image.url ?? reference.image.dataUrl ?? reference.id;
  if (reference.image.url) {
    try {
      const url = new URL(reference.image.url);
      url.search = "";
      return `${reference.kind}:${reference.id}:${url.toString()}`;
    } catch {
      // Hash the raw source below.
    }
  }
  return `${reference.kind}:${reference.id}:${source}`;
}

function imageHash(reference: CacheableImageReference): string {
  return createHash("sha256")
    .update(canonicalImageIdentity(reference))
    .digest("hex");
}

export function getImageCachePath(
  reference: ImageReference,
  extension = "png",
  persistent = false,
): string {
  const directory = persistent ? FAVORITES_DIR : CACHE_DIR;
  return path.join(directory, `${imageHash(reference)}.${extension}`);
}

async function findExistingImage(
  reference: CacheableImageReference,
  persistent = false,
): Promise<string | undefined> {
  const directory = persistent ? FAVORITES_DIR : CACHE_DIR;
  const prefix = `${imageHash(reference)}.`;
  try {
    const files = await readdir(directory);
    for (const file of files) {
      if (!file.startsWith(prefix)) continue;
      const candidate = path.join(directory, file);
      try {
        if ((await stat(candidate)).isFile()) return candidate;
      } catch {
        // Continue looking for another valid cached extension.
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function decodeDataUrl(dataUrl: string): {
  bytes: Buffer;
  contentType: string;
} {
  const match = dataUrl.match(/^data:(image\/[^;,]+);base64,(.+)$/s);
  if (!match?.[1] || !match[2]) {
    throw new MobbinError(
      "Unsupported inline image data.",
      "contract-mismatch",
    );
  }
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.byteLength > MAX_IMAGE_BYTES) {
    throw new MobbinError("The Mobbin image exceeds 25 MB.", "bad-request");
  }
  return { bytes, contentType: match[1] };
}

async function fetchImage(
  image: ReferenceImage,
  parentSignal?: AbortSignal,
): Promise<{ bytes: Buffer; contentType: string }> {
  if (parentSignal?.aborted) throw abortError(parentSignal.reason);
  if (image.dataUrl) return decodeDataUrl(image.dataUrl);
  if (!image.url) {
    throw new MobbinError(
      "This result has no downloadable image.",
      "not-found",
    );
  }

  let url: URL;
  try {
    url = new URL(image.url);
  } catch {
    throw new MobbinError(
      "Mobbin returned an invalid image URL.",
      "bad-request",
    );
  }
  if (url.protocol !== "https:") {
    throw new MobbinError(
      "Only HTTPS image downloads are allowed.",
      "bad-request",
    );
  }

  const timeout = createTimeoutSignal(IMAGE_TIMEOUT_MS, parentSignal);
  try {
    const response = await fetch(url, { signal: timeout.signal });
    if (!response.ok) {
      throw new MobbinError(
        `Failed to download image (${response.status}).`,
        "network-error",
        { status: response.status },
      );
    }
    const contentType =
      response.headers.get("Content-Type")?.split(";")[0] ?? "";
    if (!contentType.toLowerCase().startsWith("image/")) {
      throw new MobbinError(
        "Mobbin returned a non-image download.",
        "contract-mismatch",
      );
    }
    const contentLength = Number(response.headers.get("Content-Length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) {
      await response.body?.cancel();
      throw new MobbinError("The Mobbin image exceeds 25 MB.", "bad-request");
    }
    const bytes = await readResponseBytes(response);
    return { bytes, contentType };
  } catch (error) {
    if (parentSignal?.aborted) throw abortError(parentSignal.reason);
    if (
      timeout.signal.aborted &&
      timeout.signal.reason instanceof Error &&
      timeout.signal.reason.name === "TimeoutError"
    ) {
      throw new MobbinError("Mobbin image download timed out.", "timeout");
    }
    if (isAbortError(error)) throw error;
    if (error instanceof MobbinError) throw error;
    throw new MobbinError(getErrorMessage(error), "network-error");
  } finally {
    timeout.dispose();
  }
}

async function readResponseBytes(response: Response): Promise<Buffer> {
  if (!response.body) {
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.byteLength > MAX_IMAGE_BYTES)
      throw new MobbinError("The Mobbin image exceeds 25 MB.", "bad-request");
    return bytes;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new MobbinError("The Mobbin image exceeds 25 MB.", "bad-request");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(
    chunks.map((chunk) => Buffer.from(chunk)),
    total,
  );
}

async function cacheImage(
  reference: CacheableImageReference,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) throw abortError(signal.reason);
  const key = imageHash(reference);
  let entry = inFlightImages.get(key);
  if (!entry) {
    const controller = new AbortController();
    const consumers = new Set<symbol>();
    const promise = (async () => {
      const existing = await findExistingImage(reference);
      if (existing) return existing;
      const { bytes, contentType } = await fetchImage(
        reference.image,
        controller.signal,
      );
      const imagePath = path.join(
        CACHE_DIR,
        `${key}.${extensionFromContentType(contentType)}`,
      );
      await mkdir(path.dirname(imagePath), { recursive: true });
      await writeFile(imagePath, bytes);
      scheduleImageCachePrune();
      return imagePath;
    })().finally(() => {
      inFlightImages.delete(key);
    });
    entry = { controller, consumers, promise };
    inFlightImages.set(key, entry);
  }

  const consumer = Symbol(key);
  entry.consumers.add(consumer);
  try {
    return await waitForAbortable(entry.promise, signal);
  } finally {
    entry.consumers.delete(consumer);
    if (
      entry.consumers.size === 0 &&
      inFlightImages.get(key) === entry &&
      !entry.controller.signal.aborted
    ) {
      entry.controller.abort();
    }
  }
}

export async function cacheReferenceImage(
  reference: ImageReference,
  signal?: AbortSignal,
): Promise<string> {
  return cacheImage(reference, signal);
}

export async function cacheMobbinReferenceImage(
  reference: MobbinReference,
  signal?: AbortSignal,
): Promise<string> {
  if (reference.kind !== "flow") return cacheImage(reference, signal);
  if (!reference.coverImage) {
    throw new MobbinError(
      "This flow has no downloadable cover image.",
      "not-found",
    );
  }
  return cacheImage(
    {
      kind: reference.kind,
      id: reference.id,
      appName: reference.appName,
      image: reference.coverImage,
    },
    signal,
  );
}

export async function cacheFavoriteImage(
  reference: ImageReference,
): Promise<string> {
  const existing = await findExistingImage(reference, true);
  if (existing) return existing;
  const cached = await cacheReferenceImage(reference);
  const extension = path.extname(cached).slice(1) || "png";
  const favoritePath = getImageCachePath(reference, extension, true);
  await mkdir(path.dirname(favoritePath), { recursive: true });
  await copyFile(cached, favoritePath);
  return favoritePath;
}

export async function removeFavoriteImage(imagePath: string): Promise<void> {
  const resolved = path.resolve(imagePath);
  const favoritesRoot = `${path.resolve(FAVORITES_DIR)}${path.sep}`;
  if (!resolved.startsWith(favoritesRoot)) return;
  await unlink(resolved).catch(() => undefined);
}

export async function validateFavoriteImagePath(
  imagePath: string,
): Promise<string | undefined> {
  const resolved = path.resolve(imagePath);
  const favoritesRoot = `${path.resolve(FAVORITES_DIR)}${path.sep}`;
  if (!resolved.startsWith(favoritesRoot)) return undefined;
  try {
    await access(resolved);
    return resolved;
  } catch {
    return undefined;
  }
}

function sanitizeFilename(value: string): string {
  const sanitized = value
    .normalize("NFKD")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return sanitized || "mobbin-image";
}

async function uniqueDownloadPath(
  reference: ImageReference,
  extension: string,
): Promise<string> {
  const downloads = path.join(os.homedir(), "Downloads");
  await mkdir(downloads, { recursive: true });
  const shortId = createHash("sha256")
    .update(reference.id)
    .digest("hex")
    .slice(0, 8);
  const base = `${sanitizeFilename(reference.appName)}-${shortId}`;
  for (let suffix = 0; ; suffix += 1) {
    const candidate = path.join(
      downloads,
      `${base}${suffix === 0 ? "" : `-${suffix + 1}`}.${extension}`,
    );
    try {
      await stat(candidate);
    } catch {
      return candidate;
    }
  }
}

export async function downloadReferenceImage(
  reference: ImageReference,
): Promise<string> {
  const cached = await cacheReferenceImage(reference);
  const extension = path.extname(cached).slice(1) || "png";
  const destination = await uniqueDownloadPath(reference, extension);
  await copyFile(cached, destination);
  return destination;
}

export async function copyReferenceImageFile(
  reference: ImageReference,
): Promise<string> {
  const imagePath = await cacheReferenceImage(reference);
  await Clipboard.copy({ file: imagePath });
  return imagePath;
}

export async function pasteReferenceImageFile(
  reference: ImageReference,
): Promise<string> {
  const imagePath = await cacheReferenceImage(reference);
  await Clipboard.paste({ file: imagePath });
  return imagePath;
}

export function isImageExpired(image: ReferenceImage): boolean {
  if (!image.expiresAt) return false;
  const expiresAt = Date.parse(image.expiresAt);
  return Number.isFinite(expiresAt) && expiresAt <= Date.now();
}

export async function pruneImageCache(): Promise<void> {
  let entries: { path: string; modifiedAt: number }[];
  try {
    const files = await readdir(CACHE_DIR);
    entries = (
      await Promise.all(
        files.map(async (file) => {
          const filePath = path.join(CACHE_DIR, file);
          try {
            const metadata = await stat(filePath);
            return metadata.isFile()
              ? { path: filePath, modifiedAt: metadata.mtimeMs }
              : undefined;
          } catch {
            return undefined;
          }
        }),
      )
    ).filter((entry): entry is { path: string; modifiedAt: number } =>
      Boolean(entry),
    );
  } catch {
    return;
  }

  entries.sort((left, right) => right.modifiedAt - left.modifiedAt);
  const cutoff = Date.now() - CACHE_MAX_AGE_MS;
  await Promise.all(
    entries
      .filter(
        (entry, index) => index >= MAX_CACHE_FILES || entry.modifiedAt < cutoff,
      )
      .map((entry) => unlink(entry.path).catch(() => undefined)),
  );
}

function scheduleImageCachePrune(): void {
  if (Date.now() - lastPrunedAt < PRUNE_INTERVAL_MS) return;
  lastPrunedAt = Date.now();
  void pruneImageCache().catch(() => undefined);
}
