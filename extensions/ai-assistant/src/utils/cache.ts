import { LocalStorage } from "@raycast/api";

// Types of data that can be cached
export type CacheableData = {
  summary?: {
    title: string;
    topic: string;
    summary: string;
    highlights: string[];
    resources: string[];
    url: string;
  };
  translation?: {
    original: string;
    translated: string;
    detectedLanguage?: string;
  };
  dictation?: {
    text: string;
    confidence: number;
    language?: string;
  };
};

interface CacheEntry<T extends keyof CacheableData> {
  timestamp: number;
  data: CacheableData[T];
}

interface CacheKey {
  source: string;
  type: keyof CacheableData;
  language: string;
  content: string;
}

const CACHE_PREFIX = "ai_assistant_cache_";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Generates a unique cache key based on the input parameters
 */
function generateCacheKey(key: CacheKey): string {
  // Create a hash of the content to avoid too long keys
  const contentHash = Buffer.from(key.content).toString("base64");
  return `${CACHE_PREFIX}${key.type}_${key.source}_${key.language}_${contentHash}`;
}

/**
 * Checks if a cache entry is still valid
 */
function isCacheValid<T extends keyof CacheableData>(entry: CacheEntry<T>): boolean {
  const now = Date.now();
  return now - entry.timestamp < CACHE_DURATION;
}

/**
 * Gets a value from the cache
 */
export async function getCacheValue<T extends keyof CacheableData>(key: CacheKey): Promise<CacheableData[T] | null> {
  try {
    const cacheKey = generateCacheKey(key);
    const cachedData = await LocalStorage.getItem<string>(cacheKey);

    if (!cachedData) return null;

    const entry: CacheEntry<T> = JSON.parse(cachedData);
    if (!isCacheValid(entry)) {
      await LocalStorage.removeItem(cacheKey);
      return null;
    }

    return entry.data;
  } catch (error) {
    console.error("Cache read error:", error);
    return null;
  }
}

/**
 * Sets a value in the cache
 */
export async function setCacheValue<T extends keyof CacheableData>(
  key: CacheKey,
  value: CacheableData[T],
): Promise<void> {
  try {
    const cacheKey = generateCacheKey(key);
    const entry: CacheEntry<T> = {
      timestamp: Date.now(),
      data: value,
    };

    await LocalStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.error("Cache write error:", error);
  }
}

/**
 * Clears all cached entries
 */
export async function clearCache(): Promise<void> {
  try {
    const allItems = await LocalStorage.allItems();
    const cacheKeys = Object.keys(allItems).filter((key) => key.startsWith(CACHE_PREFIX));

    await Promise.all(cacheKeys.map((key) => LocalStorage.removeItem(key)));
  } catch (error) {
    console.error("Cache clear error:", error);
  }
}

/**
 * Removes expired cache entries
 */
export async function cleanExpiredCache(): Promise<void> {
  try {
    const allItems = await LocalStorage.allItems();
    const cacheKeys = Object.keys(allItems).filter((key) => key.startsWith(CACHE_PREFIX));

    await Promise.all(
      cacheKeys.map(async (key) => {
        const cachedData = await LocalStorage.getItem<string>(key);
        if (cachedData) {
          const entry: CacheEntry<keyof CacheableData> = JSON.parse(cachedData);
          if (!isCacheValid(entry)) {
            await LocalStorage.removeItem(key);
          }
        }
      }),
    );
  } catch (error) {
    console.error("Cache cleanup error:", error);
  }
}
