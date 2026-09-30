import { Cache } from "@raycast/api";
import { usePromise } from "@raycast/utils";

export function useCachedFetch<TCacheKey extends string, TData>(key: TCacheKey, fetcher: () => Promise<TData>) {
  return usePromise(async () => {
    const cachedData = getFromCache<typeof key, TData>(key);

    if (cachedData) {
      return cachedData;
    } else {
      const data = await fetcher();
      saveToCache<typeof key, TData>(key, data);

      return data;
    }
  });
}

type CacheEntry<TData> = { timestamp: number; data: TData };

const cache = new Cache();

const CACHE_DURATION_IN_MS = 5 * 60 * 1_000;

function saveToCache<TCacheKey extends string, TData>(key: TCacheKey, data: TData) {
  const cachedData: CacheEntry<TData> = { data, timestamp: Date.now() };
  cache.set(key, JSON.stringify(cachedData));
}

function getFromCache<TCacheKey extends string, TData>(key: TCacheKey): TData | undefined {
  const cachedData = cache.get(key);

  if (cachedData) {
    const parsedData = JSON.parse(cachedData) as CacheEntry<TData>;
    if (Date.now() - parsedData.timestamp < CACHE_DURATION_IN_MS) {
      return parsedData.data;
    }
  }
}
