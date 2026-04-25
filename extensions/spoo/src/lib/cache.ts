import { Cache } from "@raycast/api";

const cache = new Cache();

interface CacheEntry<T> {
  data: T;
  ts: number;
}

export function readCached<T>(key: string, ttl?: number): T | undefined {
  const raw = cache.get(key);
  if (!raw) return undefined;
  try {
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (entry.ts && ttl && Date.now() - entry.ts > ttl) {
      cache.remove(key);
      return undefined;
    }
    return entry.data ?? (entry as unknown as T);
  } catch {
    return undefined;
  }
}

export function writeCached<T>(key: string, value: T): void {
  const entry: CacheEntry<T> = { data: value, ts: Date.now() };
  cache.set(key, JSON.stringify(entry));
}

export function clearCached(key: string): void {
  cache.remove(key);
}
