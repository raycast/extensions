// src/utils/cache.ts

import { Cache, CachedContent } from "../types";
import { useCachedState } from "@raycast/utils";

export const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Checks if the cached content is still valid based on its timestamp.
 * @param cached - The cached content to validate.
 * @returns True if the cache is valid, false otherwise.
 */
export function isValidCache(cached: CachedContent | undefined): boolean {
  if (!cached) return false;
  return Date.now() - cached.timestamp < CACHE_DURATION;
}

/**
 * Initializes and returns a file cache state.
 * @returns A stateful cache object.
 */
export function useFileCache(): [Cache, (newCache: Cache) => void] {
  return useCachedState<Cache>("file-cache", {});
}

/**
 * Delays execution for a specified number of milliseconds.
 * @param ms - The number of milliseconds to delay.
 * @returns A promise that resolves after the delay.
 */
export async function delay(ms: number): Promise<void> {
  if (typeof ms !== "number" || ms < 0) {
    throw new Error("Delay time must be a non-negative number");
  }
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Creates a new cache entry with the current timestamp.
 * @param content - The content to cache.
 * @returns A new CachedContent object.
 */
export function createCacheEntry(content: string): CachedContent {
  return {
    content,
    timestamp: Date.now(),
  };
}

/**
 * Retrieves cached content for a given key if valid.
 * @param cache - The cache object.
 * @param key - The key for the cached content.
 * @returns The cached content if valid, otherwise null.
 */
export function getCachedContent(cache: Cache, key: string): string | null {
  const entry = cache[key];
  if (!entry) {
    return null;
  }
  if (isValidCache(entry)) {
    return entry.content;
  }
  return null;
}

/**
 * Sets a new cache entry for a given key.
 * @param cache - The current cache object.
 * @param key - The key for the new cache entry.
 * @param content - The content to cache.
 * @returns The updated cache object.
 */
export function setCachedContent(cache: Cache, key: string, content: string): Cache {
  return {
    ...cache,
    [key]: createCacheEntry(content),
  };
}
