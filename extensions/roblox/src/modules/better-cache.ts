import { Cache } from "@raycast/api";

interface CacheItem<T> {
  value: T;
  expiry: number | null;
}

interface BetterCacheOptions extends Cache.Options {
  defaultTTL?: number;
}

class BetterCache<T = unknown> {
  private cache: Cache;
  private defaultTTL: number | undefined;

  constructor(options?: BetterCacheOptions) {
    this.cache = new Cache(options);
    this.defaultTTL = options?.defaultTTL;
  }

  get<U = T>(key: string): U | undefined {
    const item = this.cache.get(key);
    if (!item) return undefined;

    const parsed = JSON.parse(item) as CacheItem<U>;
    if (parsed.expiry && Date.now() > parsed.expiry) {
      this.remove(key);
      return undefined;
    }

    return parsed.value;
  }

  set<U = T>(key: string, value: U, ttl?: number): void {
    const expiry = ttl ?? this.defaultTTL;
    const item: CacheItem<U> = {
      value,
      expiry: expiry ? Date.now() + expiry * 1000 : null,
    };
    this.cache.set(key, JSON.stringify(item));
  }

  remove(key: string): boolean {
    return this.cache.remove(key);
  }

  has(key: string): boolean {
    const item = this.get(key);
    return item !== undefined;
  }

  clear(options?: { notifySubscribers: boolean }): void {
    this.cache.clear(options);
  }

  subscribe(subscriber: (key: string | undefined, data: T | undefined) => void): () => void {
    return this.cache.subscribe((key, data) => {
      if (data === undefined) {
        subscriber(key, undefined);
      } else {
        const parsed = JSON.parse(data) as CacheItem<T>;
        subscriber(key, parsed.value);
      }
    });
  }

  get isEmpty(): boolean {
    return this.cache.isEmpty;
  }
}

export default BetterCache;
