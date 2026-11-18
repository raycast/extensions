import { LocalStorage } from "@raycast/api";
import { CACHE_KEYS } from "./constants";
import type { CachedData, CacheMetadata } from "../types";

// Re-export pure utility functions for consumers
export { isCacheStale, shouldRefreshCache, getCacheStatus, getLastSyncedDate, formatLastSynced } from "./cache-utils";

/**
 * Retrieves cached data from LocalStorage
 */
export async function getCachedData(): Promise<CachedData | null> {
  try {
    const data = await LocalStorage.getItem<string>(CACHE_KEYS.DATA);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as CachedData;
  } catch {
    return null;
  }
}

/**
 * Stores cached data in LocalStorage
 */
export async function setCachedData(data: CachedData): Promise<void> {
  await LocalStorage.setItem(CACHE_KEYS.DATA, JSON.stringify(data));

  // Also update metadata for quick status checks
  const metadata: CacheMetadata = {
    exportedAt: data.exportedAt,
    etag: data.etag,
    cacheUntil: data.cacheUntil,
    counts: {
      areas: data.areas.length,
      sections: data.sections.length,
      links: data.links.length,
    },
  };
  await LocalStorage.setItem(CACHE_KEYS.METADATA, JSON.stringify(metadata));
}

/**
 * Retrieves cache metadata for quick status checks without loading full data
 */
export async function getCacheMetadata(): Promise<CacheMetadata | null> {
  try {
    const data = await LocalStorage.getItem<string>(CACHE_KEYS.METADATA);
    if (!data) {
      return null;
    }
    return JSON.parse(data) as CacheMetadata;
  } catch {
    return null;
  }
}

/**
 * Clears all cached data from LocalStorage
 */
export async function clearCache(): Promise<void> {
  await Promise.all([LocalStorage.removeItem(CACHE_KEYS.DATA), LocalStorage.removeItem(CACHE_KEYS.METADATA)]);
}
