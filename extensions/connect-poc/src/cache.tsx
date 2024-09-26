import { LocalStorage } from "@raycast/api";

interface CacheItem<T> {
  data: T;
  timestamp: number;
}

const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes in milliseconds

export async function getCachedData<T>(key: string): Promise<T | null> {
  const cachedItem = await LocalStorage.getItem<string>(key);
  if (!cachedItem) return null;

  const { data, timestamp }: CacheItem<T> = JSON.parse(cachedItem);
  if (Date.now() - timestamp > CACHE_EXPIRY) {
    await LocalStorage.removeItem(key);
    return null;
  }

  return data;
}

export async function setCachedData<T>(key: string, data: T): Promise<void> {
  const cacheItem: CacheItem<T> = {
    data,
    timestamp: Date.now(),
  };
  await LocalStorage.setItem(key, JSON.stringify(cacheItem));
}
