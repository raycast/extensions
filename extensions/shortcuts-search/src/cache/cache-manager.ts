import { LocalStorage } from "@raycast/api";

export class CacheManager {
  private static readonly TTL_MILLIS = 3600_000;

  public async getCachedItem<T>(cacheKey: string): Promise<CachedItem<T> | undefined> {
    const cachedStringValue = await LocalStorage.getItem<string>(cacheKey);
    if (cachedStringValue === undefined) {
      return undefined;
    }
    return JSON.parse(cachedStringValue) as CachedItem<T>;
  }

  public async setValueWithTtl<T>(cacheKey: string, value: T) {
    const newCachedItem: CachedItem<T> = {
      lastUpdateTs: Date.now(),
      data: value,
    };
    await LocalStorage.setItem(cacheKey, JSON.stringify(newCachedItem));
  }

  public cacheItemIsValid(cachedItem: CachedItem<unknown> | undefined): boolean {
    if (cachedItem === undefined) {
      return false;
    }

    return cachedItem.lastUpdateTs + CacheManager.TTL_MILLIS > Date.now();
  }
}

export interface CachedItem<T> {
  data: T;
  lastUpdateTs: number;
}
