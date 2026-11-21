import { Cache } from "@raycast/api";

const cache = new Cache();

type CacheEntry<T> = { data: T; timestamp: number };

const invalidations = new Map<string, number>();

export function withCache<TArgs extends unknown[], TResult>(
  key: string,
  ttlMs: number,
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args) => {
    const cacheKey = args.length > 0 ? `${key}:${JSON.stringify(args)}` : key;
    const raw = cache.get(cacheKey);
    if (raw) {
      try {
        const entry: CacheEntry<TResult> = JSON.parse(raw);
        if (Date.now() - entry.timestamp < ttlMs) return entry.data;
      } catch {
        /* corrupted cache, proceed to fetch */
      }
    }
    const invalidated = invalidations.get(cacheKey);
    const data = await fn(...args);
    // A response requested before the last invalidation may predate the change, so don't cache it.
    if (invalidations.get(cacheKey) === invalidated) {
      cache.set(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    }
    return data;
  };
}

export function invalidateCache(...keys: string[]) {
  for (const key of keys) {
    cache.remove(key);
    invalidations.set(key, (invalidations.get(key) ?? 0) + 1);
  }
}
