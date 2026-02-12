import { Cache } from "@raycast/api";
import { fetchAllProviders, getEnabledProviderIds } from "./providers/registry";
import { ProviderResult } from "./types";
import { formatLastUpdatedAt } from "./utils";

const cache = new Cache();
export const LAST_FETCH_KEY = "menu-bar-last-fetch";
export const CACHED_DATA_KEY = "menu-bar-cached-data";
export const CACHED_PROVIDERS_KEY = "menu-bar-cached-providers";

/** Read from cache if present and providers unchanged; otherwise fetch. Used by view-usage and menu-bar. */
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

/** Write results to cache. Used by menu-bar interval refresh and after fetch in fetchFromCacheOrNetwork. */
export const writeCache = (results: ProviderResult[]): void => {
  cache.set(LAST_FETCH_KEY, String(Date.now()));
  cache.set(CACHED_DATA_KEY, JSON.stringify(results));
  cache.set(CACHED_PROVIDERS_KEY, getEnabledProviderIds().join(","));
};

export const getCachedData = (): string | undefined => cache.get(CACHED_DATA_KEY);

export const getLastFetchKey = (): string | undefined => cache.get(LAST_FETCH_KEY);

/** Clear cache (e.g. before manual refresh so next read will fetch). */
export const clearCache = (): void => {
  cache.remove(LAST_FETCH_KEY);
  cache.remove(CACHED_DATA_KEY);
  cache.remove(CACHED_PROVIDERS_KEY);
};

/** Formatted "last updated" string from cache timestamp, or null if never fetched. */
export const getLastUpdatedFormatted = (): string | null => {
  const key = cache.get(LAST_FETCH_KEY);
  return key ? formatLastUpdatedAt(parseInt(key, 10)) : null;
};
