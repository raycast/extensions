import { Cache } from "@raycast/api";

export const FIVE_MINUTES_MS = 1000 * 60 * 5;
export const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7;

type FetchDataFn<T> = () => Promise<T>;

interface CachedData<T> {
  data: T;
  timestamp: number;
}

export const withCache = async <T>(
  cacheKey: string,
  fetchDataFn: FetchDataFn<T>,
  cacheDurationMs: number = FIVE_MINUTES_MS,
): Promise<T> => {
  const cache = new Cache();
  const cachedData = cache.get(cacheKey);

  if (cachedData) {
    const { data, timestamp }: CachedData<T> = JSON.parse(cachedData);
    if (Date.now() - timestamp < cacheDurationMs) {
      return data;
    }
  }

  try {
    const data = await fetchDataFn();
    const cacheData: CachedData<T> = { data, timestamp: Date.now() };
    cache.set(cacheKey, JSON.stringify(cacheData));
    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Can't fetch data, please try again later. Error: ${error.message}`);
    }
    throw new Error("Can't fetch data, please try again later.");
  }
};
