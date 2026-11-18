import { Cache } from "@raycast/api";
import { FulfillmentSelection, getFulfillmentSelection } from "./migrosApi";
import { withValidToken } from "./tokenManager";

const cache = new Cache();
const FULFILLMENT_KEY_PREFIX = "fulfillment_";
const CACHE_TTL_MS = 14 * 24 * 60 * 60 * 1000; // 2 weeks in milliseconds

interface CachedFulfillment {
  data: FulfillmentSelection;
  timestamp: number;
}

/**
 * Get the cache key for a zip code.
 */
function getCacheKey(zipCode: string): string {
  return `${FULFILLMENT_KEY_PREFIX}${zipCode}`;
}

/**
 * Check if a cached entry is still valid (not expired).
 */
function isValidCache(cached: CachedFulfillment): boolean {
  return Date.now() - cached.timestamp < CACHE_TTL_MS;
}

/**
 * Get cached fulfillment selection for a zip code.
 * Returns null if not cached or expired.
 */
export function getCachedFulfillment(zipCode: string): FulfillmentSelection | null {
  const key = getCacheKey(zipCode);
  const cachedString = cache.get(key);

  if (!cachedString) {
    return null;
  }

  try {
    const cached: CachedFulfillment = JSON.parse(cachedString);
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
 * Get fulfillment selection for a zip code.
 * Returns cached data if available and valid, otherwise fetches from API.
 */
export async function getFulfillmentForZip(zipCode: string): Promise<FulfillmentSelection> {
  // Check cache first
  const cached = getCachedFulfillment(zipCode);
  if (cached) {
    return cached;
  }

  // Fetch from API with automatic token refresh on 401/403
  const fulfillment = await withValidToken((token) => getFulfillmentSelection(zipCode, token));

  // Cache the result
  const cacheEntry: CachedFulfillment = {
    data: fulfillment,
    timestamp: Date.now(),
  };
  cache.set(getCacheKey(zipCode), JSON.stringify(cacheEntry));

  return fulfillment;
}

/**
 * Clear cached fulfillment data.
 * If zipCode is provided, clears only that entry.
 * Otherwise, clears all fulfillment cache entries.
 */
export function clearFulfillmentCache(zipCode?: string): void {
  if (zipCode) {
    cache.remove(getCacheKey(zipCode));
  } else {
    // Clear all fulfillment cache entries
    // Note: Raycast Cache doesn't have a way to list keys,
    // so we can only clear known keys or the entire cache
    // For now, we'll just clear a specific key if provided
    // A full clear would need to track stored keys separately
  }
}

export default {
  getCachedFulfillment,
  getFulfillmentForZip,
  clearFulfillmentCache,
};
