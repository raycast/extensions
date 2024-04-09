import { Cache } from "@raycast/api";

function getMinutesBetweenDates(date1: Date, date2: Date): number {
  const diffInMilliseconds = Math.abs(date2.getTime() - date1.getTime());
  return diffInMilliseconds / (1000 * 60);
}

// a cache entry can  be used to store strings inside of the cache
// which will automatically expire after some minutes
export interface CacheEntry {
  data: string;
  expiresInMinutes: number;
  createdAt: string;
}

export class MyCache {
  cache = new Cache();

  set(key: string, value: string, expiresInMinutes: number) {
    // create a cache entry with the current time
    const data = {
      data: value,
      expiresInMinutes: expiresInMinutes,
      createdAt: new Date().toString(),
    };
    this.cache.set(key, JSON.stringify(data));
  }

  get(key: string) {
    const data = this.cache.get(key);
    console.log(`Trying to get cache for ${key}`);

    // Calculate whether the entry is expired (more living minutes than it should have)
    // Return the entry only when it exists and when is is not yet expired
    if (data) {
      const cacheEntry = JSON.parse(data) as CacheEntry;
      const livingMinutes = getMinutesBetweenDates(new Date(cacheEntry.createdAt), new Date());
      if (livingMinutes < cacheEntry.expiresInMinutes) {
        console.log(`Found ${key} in cache`);
        return cacheEntry.data;
      } else {
        console.log(`${key} is expired`);
        return undefined;
      }
    } else {
      console.log(`${key} NOT in cache`);
      return undefined;
    }
  }

  clear() {
    this.cache.clear();
  }
}

export const cache = new MyCache();
