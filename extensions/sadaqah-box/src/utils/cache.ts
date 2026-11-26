/**
 * Caching utilities using Raycast Cache API
 * Provides TTL-based and host-scoped caching for API responses
 */

import { Cache } from "@raycast/api";

const cache = new Cache();

// Track keys seen in this process so prefix invalidation can clear parameterized entries
const trackedKeys = new Set<string>();

export const CACHE_TTL = {
  BOXES: 5 * 60 * 1000, // 5 minutes
  CURRENCIES: 60 * 60 * 1000, // 1 hour
  STATS: 2 * 60 * 1000, // 2 minutes
  DEFAULT: 5 * 60 * 1000, // 5 minutes default
} as const;

export type CacheKey = string;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Build a cache key scoped to the configured API host
 */
export function buildCacheKey(scope: string, ...parts: Array<string | number>): string {
  return [scope, ...parts].join(":");
}

/**
 * Get cached data with type safety and TTL expiration
 */
export function getCachedData<T>(key: CacheKey): T | null {
  try {
    const cached = cache.get(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.remove(key);
      trackedKeys.delete(key);
      return null;
    }

    trackedKeys.add(key);
    return entry.data;
  } catch {
    cache.remove(key);
    trackedKeys.delete(key);
    return null;
  }
}

/**
 * Set cached data with TTL
 */
export function setCachedData<T>(key: CacheKey, data: T, ttlMs: number = CACHE_TTL.DEFAULT): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  };
  trackedKeys.add(key);
  cache.set(key, JSON.stringify(entry));
}

/**
 * Remove cached data for a single key
 */
export function removeCachedData(key: CacheKey): void {
  trackedKeys.delete(key);
  cache.remove(key);
}

/**
 * Remove all cached entries matching a prefix
 */
export function invalidateByPrefix(prefix: string): void {
  for (const key of Array.from(trackedKeys)) {
    if (key.startsWith(prefix)) {
      trackedKeys.delete(key);
      cache.remove(key);
    }
  }
}

/**
 * Clear all cached data
 */
export function clearCache(): void {
  trackedKeys.clear();
  cache.clear();
}

/**
 * Cache wrapper for async functions
 */
export async function withCache<T>(
  key: CacheKey,
  fetchFn: () => Promise<T>,
  ttlMs: number = CACHE_TTL.DEFAULT,
): Promise<T> {
  const cached = getCachedData<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetchFn();
  setCachedData(key, data, ttlMs);
  return data;
}
