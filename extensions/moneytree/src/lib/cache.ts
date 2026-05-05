import { Cache } from "@raycast/api";
import { CACHE_TTL } from "./constants";

const cache = new Cache();

/**
 * Get cached data
 */
export function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) {
    console.debug(`[Cache] MISS: ${key} - No cached data found`);
    return null;
  }

  try {
    const parsed = JSON.parse(cached);
    // Check if cache is expired
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      console.debug(`[Cache] MISS: ${key} - Cache expired at ${new Date(parsed.expiresAt).toISOString()}`);
      cache.remove(key);
      return null;
    }
    const timeUntilExpiry = Math.round((parsed.expiresAt - Date.now()) / 1000);
    console.debug(`[Cache] HIT: ${key} - Valid for ${timeUntilExpiry}s`);
    return parsed.data;
  } catch (error) {
    console.debug(`[Cache] MISS: ${key} - Failed to parse cached data: ${error}`);
    return null;
  }
}

/**
 * Set cached data with TTL
 */
export function setCached<T>(key: string, data: T, ttl: number = CACHE_TTL.CREDENTIALS): void {
  const expiresAt = Date.now() + ttl;
  const ttlSeconds = Math.round(ttl / 1000);
  console.debug(`[Cache] SET: ${key} - Cached for ${ttlSeconds}s (expires at ${new Date(expiresAt).toISOString()})`);
  cache.set(key, JSON.stringify({ data, expiresAt }));
}

/**
 * Remove cached data
 */
export function removeCached(key: string): void {
  cache.remove(key);
}

/**
 * Clear all cache
 */
export function clearCache(): void {
  cache.clear();
}

// Cache key generators
export const CACHE_KEYS = {
  // Use same cache key for credentials and accounts since they both use data_snapshot
  dataSnapshot: () => "moneytree:data_snapshot",
  transactions: (startDate: Date, endDate: Date, accountId?: number) => {
    // Normalize dates to start of day to ensure consistent cache keys
    const normalizeDate = (date: Date) => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      return normalized.getTime();
    };
    const dateKey = `${normalizeDate(startDate)}-${normalizeDate(endDate)}`;
    return accountId ? `moneytree:transactions:${accountId}:${dateKey}` : `moneytree:transactions:${dateKey}`;
  },
} as const;
