import { Cache } from "@raycast/api";

export class CacheManager {
  private static readonly TTL_MILLIS = 3600_000;
  private readonly cache: Cache = new Cache();

  public getCachedItem<T>(cacheKey: string): CachedItem<T> | undefined {
    const cachedStringValue = this.cache.get(cacheKey);
    if (cachedStringValue === undefined) {
      return undefined;
    }
    return JSON.parse(cachedStringValue) as CachedItem<T>;
  }

  public setValueWithTtl<T>(cacheKey: string, value: T) {
    const newCachedItem: CachedItem<T> = {
      lastUpdateTs: Date.now(),
      data: value,
    };
    this.cache.set(cacheKey, JSON.stringify(newCachedItem));
  }

  public cacheItemIsValid(cachedItem: CachedItem<unknown> | undefined): boolean {
    if (cachedItem === undefined) {
      return false;
    }

    return cachedItem.lastUpdateTs + CacheManager.TTL_MILLIS > Date.now();
  }
}

interface CachedItem<T> {
  data: T;
  lastUpdateTs: number;
}
