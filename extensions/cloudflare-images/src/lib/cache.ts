import { LocalStorage } from "@raycast/api";
import {
  extractImageIdFromUrl,
  type ImageCacheEntry,
} from "@mcdays/cloudflare-images-core";

const CACHE_KEY_PREFIX = "image-cache:";
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Look up a previously-uploaded image by its SHA-256 hash.
 *
 * Returns `undefined` if:
 *   - the entry doesn't exist
 *   - the entry is older than 30 days
 *   - the entry is malformed
 *   - the entry is a legacy (v0.2.1) URL-only entry and the imageId cannot
 *     be recovered (e.g. unrecognised URL format)
 *
 * Legacy entries from before v0.2.2 stored only the full delivery URL, not
 * the image ID. On first access after upgrade we recover the imageId via
 * `extractImageIdFromUrl()` and rewrite the entry to the new shape so future
 * cache hits don't re-do the work. If recovery fails (URL doesn't match the
 * `imagedelivery.net/...` pattern), the entry is dropped.
 */
export async function getCachedImage(
  hash: string,
): Promise<ImageCacheEntry | undefined> {
  const storageKey = CACHE_KEY_PREFIX + hash;
  const raw = await LocalStorage.getItem<string>(storageKey);
  if (!raw) return undefined;

  let parsed: Partial<ImageCacheEntry> | null = null;
  try {
    parsed = JSON.parse(raw) as Partial<ImageCacheEntry>;
  } catch {
    await LocalStorage.removeItem(storageKey);
    return undefined;
  }

  if (!parsed || typeof parsed.uploadedAt !== "number") {
    await LocalStorage.removeItem(storageKey);
    return undefined;
  }

  if (Date.now() - parsed.uploadedAt > CACHE_TTL_MS) {
    await LocalStorage.removeItem(storageKey);
    return undefined;
  }

  // Legacy migration: pre-v0.2.2 entries lack imageId.
  if (!parsed.imageId && parsed.url) {
    const recovered = extractImageIdFromUrl(parsed.url);
    if (!recovered) {
      // Can't recover — drop it.
      await LocalStorage.removeItem(storageKey);
      return undefined;
    }
    parsed.imageId = recovered;
  }

  if (!parsed.imageId) {
    // Neither imageId nor a recoverable URL — drop.
    await LocalStorage.removeItem(storageKey);
    return undefined;
  }

  const migrated: ImageCacheEntry = {
    hash: parsed.hash ?? hash,
    imageId: parsed.imageId,
    fileName: parsed.fileName ?? "",
    uploadedAt: parsed.uploadedAt,
  };

  // Persist the migrated shape so we don't redo this work on subsequent hits.
  if (parsed.url) {
    await LocalStorage.setItem(storageKey, JSON.stringify(migrated));
  }

  return migrated;
}

/**
 * Stores a successful upload in the cache. The URL is intentionally NOT
 * stored — surfaces rebuild it on each cache hit so variant and signing
 * preference changes between uploads are honoured.
 */
export async function addImageToCache(
  hash: string,
  imageId: string,
  fileName: string,
): Promise<void> {
  const entry: ImageCacheEntry = {
    hash,
    imageId,
    fileName,
    uploadedAt: Date.now(),
  };
  await LocalStorage.setItem(CACHE_KEY_PREFIX + hash, JSON.stringify(entry));
}
