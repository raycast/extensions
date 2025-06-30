import { LocalStorage } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

// Cache expiration time in milliseconds (1 hour)
export const CACHE_EXPIRATION = 60 * 60 * 1000;

interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Saves data to cache with a timestamp
 */
export async function saveToCache<T>(key: string, data: T): Promise<void> {
  const cachedData: CachedData<T> = {
    data,
    timestamp: Date.now(),
  };
  await LocalStorage.setItem(key, JSON.stringify(cachedData));
}

/**
 * Gets data from cache if it exists and is not expired
 * @returns The cached data or null if not found or expired
 */
export async function getFromCache<T>(key: string): Promise<T | null> {
  const cachedDataString = await LocalStorage.getItem(key);
  if (!cachedDataString) {
    return null;
  }

  try {
    const cachedData = JSON.parse(cachedDataString as string) as CachedData<T>;
    const now = Date.now();

    // Check if cache is expired (older than 1 hour)
    if (now - cachedData.timestamp > CACHE_EXPIRATION) {
      return null;
    }

    return cachedData.data;
  } catch (error) {
    showFailureToast(error, { title: "Error parsing cached data" });
    return null;
  }
}

/**
 * Clears a specific cache entry
 */
export async function clearCache(key: string): Promise<void> {
  await LocalStorage.removeItem(key);
}

/**
 * Gets the timestamp of when the cache was last updated
 * @returns The timestamp or null if cache doesn't exist
 */
export async function getCacheTimestamp(key: string): Promise<number | null> {
  const cachedDataString = await LocalStorage.getItem(key);
  if (!cachedDataString) {
    return null;
  }

  try {
    const cachedData = JSON.parse(cachedDataString as string) as CachedData<unknown>;
    return cachedData.timestamp;
  } catch (error) {
    showFailureToast(error, { title: "Error getting cache timestamp" });
    return null;
  }
}

/**
 * Checks if the cache is stale (older than expiration time)
 */
export async function isCacheStale(key: string): Promise<boolean> {
  const timestamp = await getCacheTimestamp(key);
  if (timestamp === null) {
    return true;
  }

  return Date.now() - timestamp > CACHE_EXPIRATION;
}

// Cache keys
export const CACHE_KEYS = {
  ACCOUNTS: "basecamp_accounts",
  PROJECTS: (accountId: string) => `basecamp_projects_${accountId}`,
  PEOPLE: (accountId: string, projectId: number) => `basecamp_people_${accountId}_${projectId}`,
};
