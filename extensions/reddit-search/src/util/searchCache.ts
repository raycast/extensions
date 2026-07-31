import { Cache } from "@raycast/api";
import { logger } from "@chrismessina/raycast-logger";

const cacheLog = logger.child("[SearchCache]");

/**
 * Caches search *results* (not just the query strings).
 *
 * Reddit's feed allows roughly one request per minute, so a repeated search is
 * the difference between instant results and a minute of waiting. Re-opening a
 * subreddit you just looked at, or stepping back and forth between views, should
 * not spend the one request you have.
 *
 * Entries are short-lived: Reddit results go stale quickly, and a cache that
 * outlives its usefulness is worse than none. "Refresh" bypasses and replaces it.
 */
export const CACHE_TTL_MS = 5 * 60 * 1000;

const cache = new Cache({ namespace: "search-results" });

interface CacheEntry<T> {
  cachedAt: number;
  payload: T;
}

/** Builds a stable key so the same search always maps to the same entry. */
export function cacheKey(parts: Array<string | number>): string {
  return parts.map((part) => String(part).toLowerCase()).join("|");
}

/** True when a post search for these exact params is in the (unexpired) cache. */
export function postsCached(subreddit: string, query: string, limit: number, sortValue: string): boolean {
  return !!readCache(cacheKey(["posts", subreddit, query, limit, sortValue]));
}

export function readCache<T>(key: string): { payload: T; cachedAt: number } | undefined {
  const raw = cache.get(key);
  if (!raw) {
    return undefined;
  }

  try {
    const entry = JSON.parse(raw) as CacheEntry<T>;
    const age = Date.now() - entry.cachedAt;
    if (age > CACHE_TTL_MS) {
      cacheLog.debug("cache expired", { key, ageSeconds: Math.round(age / 1000) });
      cache.remove(key);
      return undefined;
    }

    cacheLog.debug("cache hit", { key, ageSeconds: Math.round(age / 1000) });
    return { payload: entry.payload, cachedAt: entry.cachedAt };
  } catch {
    // A malformed entry is not worth failing a search over — drop it and refetch.
    cache.remove(key);
    return undefined;
  }
}

export function writeCache<T>(key: string, payload: T): void {
  cache.set(key, JSON.stringify({ cachedAt: Date.now(), payload } satisfies CacheEntry<T>));
}

export function clearCache(): void {
  cache.clear();
  cacheLog.debug("cache cleared");
}

/** Renders a cache age as "just now" / "3m ago" for the UI. */
export function describeCacheAge(cachedAt: number): string {
  const minutes = Math.floor((Date.now() - cachedAt) / 60000);
  if (minutes < 1) {
    return "just now";
  }
  return `${minutes}m ago`;
}
