import { Cache } from "@raycast/api";

const cache = new Cache();

// Cache entries expire after 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Retrieves cached data if not expired, returns null otherwise
 */
export function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  try {
    const entry: CacheEntry<T> = JSON.parse(cached);
    const now = Date.now();

    // Check if cache entry has expired
    if (now - entry.timestamp > CACHE_TTL) {
      cache.remove(key);
      return null;
    }

    return entry.data;
  } catch {
    cache.remove(key);
    return null;
  }
}

/**
 * Stores data in cache with current timestamp
 */
export function setCached<T>(key: string, data: T): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
  };
  cache.set(key, JSON.stringify(entry));
}
