// Disk-backed cache with a time-to-live, in front of network calls.
// `useCachedPromise` alone is stale-while-revalidate: it re-runs the fetch on every mount, so it
// can't keep traffic down. Wrapping the fetch itself with this cache does.
import { Cache } from "@raycast/api";

interface Entry<T> {
  storedAt: number;
  value: T;
}

export interface TtlCache<T> {
  getOrLoad(key: string, load: () => Promise<T>): Promise<T>;
  forget(key: string): void;
}

export function createTtlCache<T>({ namespace, ttlMs }: { namespace: string; ttlMs: number }): TtlCache<T> {
  const cache = new Cache({ namespace });

  const read = (key: string): T | undefined => {
    const raw = cache.get(key);
    if (!raw) return undefined;
    const entry = JSON.parse(raw) as Entry<T>;
    return Date.now() - entry.storedAt < ttlMs ? entry.value : undefined;
  };

  return {
    async getOrLoad(key, load) {
      const hit = read(key);
      if (hit !== undefined) return hit;
      const value = await load();
      cache.set(key, JSON.stringify({ storedAt: Date.now(), value } satisfies Entry<T>));
      return value;
    },
    forget(key) {
      cache.remove(key);
    },
  };
}
