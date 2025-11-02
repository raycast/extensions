import { Cache } from "@raycast/api";
import { urlToHash } from "./hash";
import { log } from "./log";

/**
 * Cache instance for storing audio files
 * Using Raycast's Cache API which handles cleanup automatically
 */
const cache = new Cache({
  namespace: "soundraw-samples",
  capacity: 50 * 1024 * 1024, // 50 MB capacity for audio files
});

/**
 * Check if a URL is cached
 * @param url The URL to check
 * @returns True if cached, false otherwise
 */
export function isCached(url: string): boolean {
  const key = urlToHash(url);
  const has = cache.has(key);
  if (has) {
    log.debug(`[cache] hit (has): soundraw-samples key=${key}`);
  } else {
    log.debug(`[cache] miss (has): soundraw-samples key=${key}`);
  }
  return has;
}

/**
 * Get cached data
 * @param url The URL to get cached data for
 * @returns The cached data buffer if it exists, null otherwise
 */
export function getCached(url: string): Buffer | null {
  const key = urlToHash(url);
  const cached = cache.get(key);

  if (cached) {
    try {
      // Convert base64 string back to Buffer
      const buf = Buffer.from(cached, "base64");
      log.debug(`[cache] hit (get): soundraw-samples key=${key} bytes=${buf.length}`);
      return buf;
    } catch {
      // Invalid cached data, remove it
      cache.remove(key);
      log.debug(`[cache] invalid entry removed: soundraw-samples key=${key}`);
      return null;
    }
  }

  log.debug(`[cache] miss (get): soundraw-samples key=${key}`);
  return null;
}

/**
 * Get cached data (alias for consistency)
 * @param url The URL to get cached data for
 * @returns The cached data buffer if it exists, null otherwise
 */
export function getCachedData(url: string): Buffer | null {
  return getCached(url);
}

/**
 * Download file from URL and cache it
 * @param url The URL to download from
 * @returns Buffer and content type of the file
 */
export async function downloadAndCache(url: string): Promise<{ buffer: Buffer; contentType: string | null }> {
  // Check cache first
  const cached = getCachedData(url);
  if (cached) {
    log.debug(`[cache] using cached data for download: ${url}`);
    // We don't have content-type from cache, but that's okay
    return { buffer: cached, contentType: null };
  }

  // Download the file
  log.debug(`[cache] downloading and caching: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch file: ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type");
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Save to cache
  saveToCache(url, buffer);

  return { buffer, contentType };
}

/**
 * Save data to cache
 * @param url The URL to cache
 * @param data The data buffer to cache
 */
export function saveToCache(url: string, data: Buffer): void {
  const key = urlToHash(url);
  // Convert Buffer to base64 string for storage
  const base64String = data.toString("base64");
  cache.set(key, base64String);
  log.debug(`[cache] set: soundraw-samples key=${key} bytes=${data.length}`);
}
