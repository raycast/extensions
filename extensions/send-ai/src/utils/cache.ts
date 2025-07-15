import { Cache } from "@raycast/api";

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // TTL in milliseconds
}

export class CacheAdapter {
  private readonly key: string;
  private readonly cache: Cache;

  constructor(key: string) {
    this.key = key;
    this.cache = new Cache({
      namespace: "send-ai",
    });
  }

  get<T>(): T | null {
    const cachedItem = this.cache.get(this.key);
    if (!cachedItem) {
      return null;
    }

    try {
      const parsed: CacheItem<T> = JSON.parse(cachedItem);
      const now = Date.now();

      // Check if cache item has expired
      if (now - parsed.timestamp > parsed.ttl) {
        this.cache.remove(this.key);
        return null;
      }

      return parsed.data;
    } catch (error) {
      // If parsing fails, remove the corrupted cache item
      console.warn(`Cache parsing failed for key ${this.key}:`, error);
      this.cache.remove(this.key);
      return null;
    }
  }

  set<T>(value: T, ttlMs: number = 2 * 60 * 1000) {
    const cacheItem: CacheItem<T> = {
      data: value,
      timestamp: Date.now(),
      ttl: ttlMs,
    };

    this.cache.set(this.key, JSON.stringify(cacheItem));
  }

  remove() {
    this.cache.remove(this.key);
  }

  clear() {
    this.cache.clear();
  }
}
