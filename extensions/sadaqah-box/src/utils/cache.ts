/**
 * Caching utilities using Raycast Cache API
 * Provides TTL-based caching with a persisted key index so prefix invalidation works across command runs
 */

import { Cache } from "@raycast/api";

const cache = new Cache();
const KEY_INDEX = "__cache_keys__";

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

function readKeyIndex(): Set<string> {
  try {
    const raw = cache.get(KEY_INDEX);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((k): k is string => typeof k === "string")) : new Set();
  } catch {
    return new Set();
  }
}

function writeKeyIndex(keys: Set<string>): void {
  if (keys.size === 0) {
    cache.remove(KEY_INDEX);
  } else {
    cache.set(KEY_INDEX, JSON.stringify(Array.from(keys)));
  }
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
      removeCachedData(key);
      return null;
    }

    return entry.data;
  } catch {
    removeCachedData(key);
    return null;
  }
}

/**
 * Set cached data with TTL and persist key in the index
 */
export function setCachedData<T>(key: CacheKey, data: T, ttlMs: number = CACHE_TTL.DEFAULT): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    ttl: ttlMs,
  };
  cache.set(key, JSON.stringify(entry));

  const keys = readKeyIndex();
  if (!keys.has(key)) {
    keys.add(key);
    writeKeyIndex(keys);
  }
}

/**
 * Remove cached data for a single key
 */
export function removeCachedData(key: CacheKey): void {
  cache.remove(key);
  const keys = readKeyIndex();
  if (keys.delete(key)) {
    writeKeyIndex(keys);
  }
}

/**
 * Remove all cached entries matching a prefix across command invocations
 */
export function invalidateByPrefix(prefix: string): void {
  const keys = readKeyIndex();
  let changed = false;

  for (const key of Array.from(keys)) {
    if (key.startsWith(prefix)) {
      cache.remove(key);
      keys.delete(key);
      changed = true;
    }
  }

  if (changed) {
    writeKeyIndex(keys);
  }
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
  const cached = getCachedData<T>(key);
  if (cached !== null) {
    return cached;
  }

  const data = await fetchFn();
  setCachedData(key, data, ttlMs);
  return data;
}
