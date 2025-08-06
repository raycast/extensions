import { Cache } from "@raycast/api";

const cache = new Cache();

export class CacheManager {
  cache: Cache;

  constructor() {
    this.cache = cache;
  }

  get<T>(key: string): T | undefined {
    const cachedValue = this.cache.get(key);
    return cachedValue ? JSON.parse(cachedValue) : undefined;
  }

  set<T>(key: string, value: T): void {
    this.cache.set(key, JSON.stringify(value));
  }

  delete(key: string): void {
    this.cache.remove(key);
  }
}
