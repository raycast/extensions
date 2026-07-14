import { Cache } from "@raycast/api";
import { searchStoresByQuery, StoreInfo } from "./migrosApi";
import { withValidToken } from "./tokenManager";

const cache = new Cache();
const STORES_KEY_PREFIX = "stores_";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds

interface CachedStores {
  data: StoreInfo[];
  timestamp: number;
}

/**
 * Get the cache key for a zip code.
 */
function getCacheKey(zipCode: string): string {
  return `${STORES_KEY_PREFIX}${zipCode}`;
}

/**
 * Check if a cached entry is still valid (not expired).
 */
function isValidCache(cached: CachedStores): boolean {
  return Date.now() - cached.timestamp < CACHE_TTL_MS;
}

/**
 * Get cached stores for a zip code.
 * Returns null if not cached or expired.
 */
export function getCachedStores(zipCode: string): StoreInfo[] | null {
  const key = getCacheKey(zipCode);
  const cachedString = cache.get(key);

  if (!cachedString) {
    return null;
  }

  try {
    const cached: CachedStores = JSON.parse(cachedString);
    if (isValidCache(cached)) {
      return cached.data;
    }
    // Expired, remove from cache
    cache.remove(key);
    return null;
  } catch {
    // Invalid JSON, remove from cache
    cache.remove(key);
    return null;
  }
}

/**
 * Get stores for a zip code.
 * Returns cached data if available and valid, otherwise fetches from API.
 */
export async function getStoresForZip(zipCode: string, maxStores?: number): Promise<StoreInfo[]> {
  // Check cache first
  const cached = getCachedStores(zipCode);
  if (cached) {
    return maxStores ? cached.slice(0, maxStores) : cached;
  }

  // Fetch from API with automatic token refresh on 401/403
  const stores = await withValidToken((token) => searchStoresByQuery(zipCode, token));
  const storeList = Array.isArray(stores) ? stores : [];

  // Cache the result
  const cacheEntry: CachedStores = {
    data: storeList,
    timestamp: Date.now(),
  };
  cache.set(getCacheKey(zipCode), JSON.stringify(cacheEntry));

  return maxStores ? storeList.slice(0, maxStores) : storeList;
}

/**
 * Clear cached store data.
 */
export function clearStoresCache(zipCode?: string): void {
  if (zipCode) {
    cache.remove(getCacheKey(zipCode));
  }
}

export default {
  getCachedStores,
  getStoresForZip,
  clearStoresCache,
};
