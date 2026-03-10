import { Cache } from "@raycast/api";

const cache = new Cache();

type CacheEntry<T> = { data: T; timestamp: number };

export function withCache<TArgs extends unknown[], TResult>(
  key: string,
  ttlMs: number,
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args) => {
    const raw = cache.get(key);
    if (raw) {
      try {
        const entry: CacheEntry<TResult> = JSON.parse(raw);
        if (Date.now() - entry.timestamp < ttlMs) return entry.data;
      } catch {
        /* corrupted cache, proceed to fetch */
      }
    }
    const data = await fn(...args);
    cache.set(key, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
  };
}

export function invalidateCache(...keys: string[]) {
  for (const key of keys) cache.remove(key);
}
