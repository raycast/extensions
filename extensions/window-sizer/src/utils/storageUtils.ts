/**
 * Cache related utility functions
 */

// Cache item interface
export interface CachedItem<T> {
  value: T;
  timestamp: number;
}

/**
 * Check if a cached item is still valid
 * @param cachedItem The cached item
 * @param cacheDuration Cache duration in milliseconds
 * @returns Whether the cache is still valid
 */
export function isCacheValid<T>(cachedItem: CachedItem<T> | null, cacheDuration: number): boolean {
  // Return false if no item or if cache duration is not positive
  if (!cachedItem || cacheDuration <= 0) return false;

  const now = Date.now();
  return now - cachedItem.timestamp < cacheDuration;
}

/**
 * Create a new cache item
 * @param value The value to cache
 * @returns A cache item with timestamp
 */
export function createCacheItem<T>(value: T): CachedItem<T> {
  return {
    value,
    timestamp: Date.now(),
  };
}

// Constants
export const HOUR_IN_MS = 60 * 60 * 1000; // 1 hour
