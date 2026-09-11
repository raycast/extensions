import { Cache } from "@raycast/api";

const cache = new Cache();
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

function getCacheKey(url: string): string {
  return `api:${url}`;
}

function isExpired(entry: CacheEntry<unknown>): boolean {
  return Date.now() - entry.timestamp >= entry.ttl;
}

/**
 * Get a value from cache
 */
export function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (!cached) return null;

  try {
    const entry = JSON.parse(cached) as CacheEntry<T>;
    if (isExpired(entry)) {
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
 * Set a value in cache with optional TTL
 */
export function setCached<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  cache.set(
    key,
    JSON.stringify({
      data,
      timestamp: Date.now(),
      ttl,
    } as CacheEntry<T>),
  );
}

/**
 * Remove a value from cache
 */
export function removeCached(key: string): void {
  cache.remove(key);
}

/**
 * Clear all cache entries
 */
export function clearCache(): void {
  cache.clear();
}

/**
 * Cached fetch function that checks cache before making API calls
 * @param url - The URL to fetch
 * @param options - Fetch options (same as native fetch)
 * @param ttl - Optional TTL in milliseconds (default: 24 hours)
 */
export async function cachedFetch(url: string, options?: RequestInit, ttl: number = DEFAULT_TTL): Promise<Response> {
  const cacheKey = getCacheKey(url);
  const cached = getCached<{ body: string; status: number; statusText: string; headers: Record<string, string> }>(
    cacheKey,
  );

  if (cached) {
    const headers = new Headers();
    Object.entries(cached.headers).forEach(([key, value]) => headers.set(key, value));
    return new Response(cached.body, {
      status: cached.status,
      statusText: cached.statusText,
      headers,
    });
  }

  const response = await fetch(url, options);

  if (response.ok) {
    const clonedResponse = response.clone();
    const body = await clonedResponse.text();
    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    setCached(cacheKey, { body, status: response.status, statusText: response.statusText, headers }, ttl);
  }

  return response;
}
