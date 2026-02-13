import { Cache } from "@raycast/api";
import { formatLastUpdatedAt } from "./format";
import { fetchAllProviders, getEnabledProviderIds } from "./providers/registry";
import { ProviderResult } from "./types";

const cache = new Cache();
export const LAST_FETCH_KEY = "menu-bar-last-fetch";
export const CACHED_DATA_KEY = "menu-bar-cached-data";
export const CACHED_PROVIDERS_KEY = "menu-bar-cached-providers";

export const fetchFromCacheOrNetwork = async (): Promise<ProviderResult[]> => {
  const currentProviders = getEnabledProviderIds().join(",");
  const cachedProviders = cache.get(CACHED_PROVIDERS_KEY);
  const cachedData = cache.get(CACHED_DATA_KEY);

  if (cachedProviders === currentProviders && cachedData) {
    try {
      return JSON.parse(cachedData) as ProviderResult[];
    } catch {
      // Fall through to fetch
    }
  }

  const results = await fetchAllProviders();
  writeCache(results);
  return results;
};

export const writeCache = (results: ProviderResult[]): void => {
  cache.set(LAST_FETCH_KEY, String(Date.now()));
  cache.set(CACHED_DATA_KEY, JSON.stringify(results));
  cache.set(CACHED_PROVIDERS_KEY, getEnabledProviderIds().join(","));
};

export const getCachedData = (): string | undefined => {
  return cache.get(CACHED_DATA_KEY);
};

export const getLastFetchKey = (): string | undefined => {
  return cache.get(LAST_FETCH_KEY);
};

export const clearCache = (): void => {
  cache.remove(CACHED_DATA_KEY);
  cache.remove(CACHED_PROVIDERS_KEY);
};

export const getLastUpdatedFormatted = (): string | null => {
  const key = cache.get(LAST_FETCH_KEY);
  return key ? formatLastUpdatedAt(parseInt(key, 10)) : null;
};
