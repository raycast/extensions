/**
 * Cache manager for plugin and marketplace data
 * Uses Raycast's Cache API with TTL support
 */

import { Cache } from "@raycast/api";

const cache = new Cache();

export const CACHE_KEYS = {
  ALL_PLUGINS: "all-plugins",
  MARKETPLACES: "marketplaces",
  INSTALLED_PLUGINS: "installed-plugins",
};

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheData<T> {
  value: T;
  timestamp: number;
}

/**
 * Get cached data with automatic TTL expiration
 */
export async function getCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = CACHE_TTL,
): Promise<T> {
  const cached = cache.get(key);

  if (cached) {
    try {
      const data: CacheData<T> = JSON.parse(cached);
      if (Date.now() - data.timestamp < ttl) {
        return data.value;
      }
    } catch (error) {
      console.error("Failed to parse cached data:", error);
    }
  }

  // Cache miss or expired - fetch new data
  const value = await fetcher();
  cache.set(
    key,
    JSON.stringify({
      value,
      timestamp: Date.now(),
    }),
  );

  return value;
}

/**
 * Invalidate cache for a specific key
 */
export function invalidateCache(key: string): void {
  cache.remove(key);
}

/**
 * Invalidate all caches
 */
export function invalidateAllCaches(): void {
  Object.values(CACHE_KEYS).forEach((key) => cache.remove(key));
}
