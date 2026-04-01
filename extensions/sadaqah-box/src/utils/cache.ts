/**
 * Caching utilities using Raycast Cache API
 * Provides caching for API responses to improve performance
 */

import { Cache } from "@raycast/api";

const cache = new Cache();

// Cache TTL in milliseconds
const CACHE_TTL = {
  BOXES: 5 * 60 * 1000, // 5 minutes
  CURRENCIES: 60 * 60 * 1000, // 1 hour
  STATS: 2 * 60 * 1000, // 2 minutes
  PRESETS: 30 * 1000, // 30 seconds (presets can change frequently)
  DEFAULT: 5 * 60 * 1000, // 5 minutes default
} as const;

type CacheKey =
  | "boxes"
  | "currencies"
  | "currency-types"
  | "stats"
  | "presets"
  | `box-${string}`
  | `collections-${string}`;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * Get cached data with type safety
 */
export function getCachedData<T>(key: CacheKey): T | null {
  try {
    const cached = cache.get(key);
    if (!cached) return null;

    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache is still valid
    if (now - entry.timestamp > entry.ttl) {
      cache.remove(key);
      return null;
    }

    return entry.data;
  } catch {
    // If parsing fails, remove corrupted cache
    cache.remove(key);
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
  cache.set(key, JSON.stringify(entry));
}

/**
 * Remove cached data
 */
export function removeCachedData(key: CacheKey): void {
  cache.remove(key);
}

/**
 * Clear all cached data
 */
export function clearCache(): void {
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
  // Try to get from cache first
  const cached = getCachedData<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetchFn();

  // Cache the result
  setCachedData(key, data, ttlMs);

  return data;
}

/**
 * Invalidate cache by key pattern
 */
export function invalidateCachePattern(): void {
  // Note: Raycast Cache doesn't support listing keys, so we use specific invalidation
  // This is a placeholder for future implementation if needed
}

// Preset-specific cache helpers
export function invalidatePresetsCache(): void {
  removeCachedData("presets");
}

export function invalidateBoxesCache(): void {
  removeCachedData("boxes");
  // Also invalidate individual box caches
  // Note: In a full implementation, we'd track all box IDs
}

export function invalidateStatsCache(): void {
  removeCachedData("stats");
}

export { CACHE_TTL };
