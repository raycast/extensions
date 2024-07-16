import { LocalStorage } from "@raycast/api";

const CACHE_EXPIRATION = 5 * 60 * 1000; // 5 minutes

export async function getCachedData(key: string): Promise<unknown | null> {
  const cachedData = await LocalStorage.getItem(key);
  if (cachedData) {
    const { data, timestamp } = JSON.parse(cachedData as string);
    if (Date.now() - timestamp < CACHE_EXPIRATION) {
      return data;
    }
  }
  return null;
}

export async function setCachedData(key: string, data: unknown): Promise<void> {
  const cacheEntry = JSON.stringify({
    data,
    timestamp: Date.now(),
  });
  await LocalStorage.setItem(key, cacheEntry);
}
