import { Cache } from "@raycast/api";
import type {
  CacheEntry,
  CollectionInfo,
  Feature,
  FeatureContent,
} from "../types";

const cache = new Cache();

const CACHE_KEYS = {
  COLLECTIONS: "devcontainer-collections",
  FEATURES: "devcontainer-features",
  CONTENT_KEYS: "devcontainer-content-keys",
} as const;

const FEATURE_CONTENT_PREFIX = "feature-content-";

// 24 hours in milliseconds (default, can be overridden by preferences)
let cacheTtlMs = 24 * 60 * 60 * 1000;

/**
 * Set cache TTL (called from preferences)
 */
export function setCacheTtl(hours: number): void {
  if (typeof hours !== "number" || hours <= 0 || !isFinite(hours)) {
    console.warn("Invalid cache TTL, using default 24 hours");
    cacheTtlMs = 24 * 60 * 60 * 1000;
    return;
  }
  cacheTtlMs = hours * 60 * 60 * 1000;
}

/**
 * Get current cache TTL in milliseconds
 */
export function getCacheTtlMs(): number {
  return cacheTtlMs;
}

/**
 * Check if a cache entry is still valid
 */
function isValid<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
  if (!entry) return false;
  if (typeof entry.timestamp !== "number") return false;
  return Date.now() - entry.timestamp < cacheTtlMs;
}

/**
 * Validate CacheEntry structure
 */
function isValidCacheEntry<T>(obj: unknown): obj is CacheEntry<T> {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "data" in obj &&
    "timestamp" in obj &&
    typeof (obj as CacheEntry<T>).timestamp === "number"
  );
}

/**
 * Validate CollectionInfo structure
 */
function isValidCollectionInfo(obj: unknown): obj is CollectionInfo {
  return (
    obj !== null &&
    typeof obj === "object" &&
    "sourceInformation" in obj &&
    "ociReference" in obj &&
    typeof (obj as CollectionInfo).sourceInformation === "string" &&
    typeof (obj as CollectionInfo).ociReference === "string"
  );
}

/**
 * Validate Feature structure
 */
function isValidFeature(obj: unknown): obj is Feature {
  if (obj === null || typeof obj !== "object") return false;
  const f = obj as Record<string, unknown>;
  return (
    typeof f.id === "string" &&
    typeof f.name === "string" &&
    typeof f.reference === "string" &&
    f.collection !== undefined &&
    isValidCollectionInfo(f.collection)
  );
}

/**
 * Validate FeatureContent structure
 */
function isValidFeatureContent(obj: unknown): obj is FeatureContent {
  if (obj === null || typeof obj !== "object") return false;
  const c = obj as Record<string, unknown>;
  return (
    (c.readme === null || typeof c.readme === "string") &&
    Array.isArray(c.scripts)
  );
}

/**
 * Get the list of cached feature content keys
 */
function getCachedContentKeys(): string[] {
  const raw = cache.get(CACHE_KEYS.CONTENT_KEYS);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.error("Invalid content keys format, clearing");
      cache.remove(CACHE_KEYS.CONTENT_KEYS);
      return [];
    }
    return parsed.filter((k): k is string => typeof k === "string");
  } catch (err) {
    console.error("Failed to parse content keys cache:", err);
    cache.remove(CACHE_KEYS.CONTENT_KEYS);
    return [];
  }
}

/**
 * Add a content key to the tracking list
 */
function addContentKey(key: string): void {
  if (typeof key !== "string" || key.length === 0) return;
  const keys = getCachedContentKeys();
  if (!keys.includes(key)) {
    keys.push(key);
    cache.set(CACHE_KEYS.CONTENT_KEYS, JSON.stringify(keys));
  }
}

/**
 * Clear all content keys
 */
function clearContentKeys(): void {
  cache.remove(CACHE_KEYS.CONTENT_KEYS);
}

/**
 * Get collections from cache
 */
export function getCachedCollections(): CollectionInfo[] | null {
  const raw = cache.get(CACHE_KEYS.COLLECTIONS);
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw);
    if (!isValidCacheEntry<CollectionInfo[]>(entry)) {
      console.error("Invalid cache entry structure for collections, clearing");
      cache.remove(CACHE_KEYS.COLLECTIONS);
      return null;
    }
    if (!isValid(entry)) {
      return null;
    }
    if (!Array.isArray(entry.data)) {
      console.error("Invalid collections data format, clearing");
      cache.remove(CACHE_KEYS.COLLECTIONS);
      return null;
    }
    // Validate each collection
    const validCollections = entry.data.filter(isValidCollectionInfo);
    if (validCollections.length !== entry.data.length) {
      console.warn("Some collections failed validation, using valid ones only");
    }
    return validCollections.length > 0 ? validCollections : null;
  } catch (err) {
    console.error("Cache corruption detected for collections, clearing:", err);
    cache.remove(CACHE_KEYS.COLLECTIONS);
    return null;
  }
}

/**
 * Save collections to cache
 */
export function setCachedCollections(collections: CollectionInfo[]): void {
  if (!Array.isArray(collections)) {
    console.error("Invalid collections data, not caching");
    return;
  }
  const entry: CacheEntry<CollectionInfo[]> = {
    data: collections,
    timestamp: Date.now(),
  };
  cache.set(CACHE_KEYS.COLLECTIONS, JSON.stringify(entry));
}

/**
 * Get features from cache
 */
export function getCachedFeatures(): Feature[] | null {
  const raw = cache.get(CACHE_KEYS.FEATURES);
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw);
    if (!isValidCacheEntry<Feature[]>(entry)) {
      console.error("Invalid cache entry structure for features, clearing");
      cache.remove(CACHE_KEYS.FEATURES);
      return null;
    }
    if (!isValid(entry)) {
      return null;
    }
    if (!Array.isArray(entry.data)) {
      console.error("Invalid features data format, clearing");
      cache.remove(CACHE_KEYS.FEATURES);
      return null;
    }
    // Validate each feature
    const validFeatures = entry.data.filter(isValidFeature);
    if (validFeatures.length !== entry.data.length) {
      console.warn("Some features failed validation, using valid ones only");
    }
    return validFeatures.length > 0 ? validFeatures : null;
  } catch (err) {
    console.error("Cache corruption detected for features, clearing:", err);
    cache.remove(CACHE_KEYS.FEATURES);
    return null;
  }
}

/**
 * Save features to cache
 */
export function setCachedFeatures(features: Feature[]): void {
  if (!Array.isArray(features)) {
    console.error("Invalid features data, not caching");
    return;
  }
  const entry: CacheEntry<Feature[]> = {
    data: features,
    timestamp: Date.now(),
  };
  cache.set(CACHE_KEYS.FEATURES, JSON.stringify(entry));
}

/**
 * Get cached feature content (README + scripts)
 */
export function getCachedFeatureContent(key: string): FeatureContent | null {
  if (typeof key !== "string" || key.length === 0) return null;

  const raw = cache.get(`${FEATURE_CONTENT_PREFIX}${key}`);
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw);
    if (!isValidCacheEntry<FeatureContent>(entry)) {
      console.error(
        `Invalid cache entry structure for feature content ${key}, clearing`,
      );
      cache.remove(`${FEATURE_CONTENT_PREFIX}${key}`);
      return null;
    }
    if (!isValid(entry)) {
      return null;
    }
    if (!isValidFeatureContent(entry.data)) {
      console.error(`Invalid feature content format for ${key}, clearing`);
      cache.remove(`${FEATURE_CONTENT_PREFIX}${key}`);
      return null;
    }
    return entry.data;
  } catch (err) {
    console.error(
      `Cache corruption detected for feature content ${key}, clearing:`,
      err,
    );
    cache.remove(`${FEATURE_CONTENT_PREFIX}${key}`);
    return null;
  }
}

/**
 * Save feature content to cache
 */
export function setCachedFeatureContent(
  key: string,
  content: FeatureContent,
): void {
  if (typeof key !== "string" || key.length === 0) {
    console.error("Invalid cache key, not caching");
    return;
  }
  if (!isValidFeatureContent(content)) {
    console.error("Invalid feature content, not caching");
    return;
  }
  const entry: CacheEntry<FeatureContent> = {
    data: content,
    timestamp: Date.now(),
  };
  cache.set(`${FEATURE_CONTENT_PREFIX}${key}`, JSON.stringify(entry));
  addContentKey(key);
}

/**
 * Clear all devcontainer feature caches (including feature content)
 */
export function clearCache(): void {
  // Clear main caches
  cache.remove(CACHE_KEYS.COLLECTIONS);
  cache.remove(CACHE_KEYS.FEATURES);

  // Clear all feature content caches
  const contentKeys = getCachedContentKeys();
  for (const key of contentKeys) {
    cache.remove(`${FEATURE_CONTENT_PREFIX}${key}`);
  }
  clearContentKeys();
}

/**
 * Clear only feature content caches (keep collections and features list)
 */
export function clearFeatureContentCache(): void {
  const contentKeys = getCachedContentKeys();
  for (const key of contentKeys) {
    cache.remove(`${FEATURE_CONTENT_PREFIX}${key}`);
  }
  clearContentKeys();
}

/**
 * Get cache timestamp (for UI display)
 */
export function getCacheTimestamp(): Date | null {
  const raw = cache.get(CACHE_KEYS.FEATURES);
  if (!raw) return null;

  try {
    const entry = JSON.parse(raw);
    if (!isValidCacheEntry<Feature[]>(entry)) {
      return null;
    }
    return new Date(entry.timestamp);
  } catch (err) {
    console.error("Failed to get cache timestamp:", err);
    return null;
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  featuresCount: number;
  contentKeysCount: number;
  timestamp: Date | null;
} {
  const features = getCachedFeatures();
  const contentKeys = getCachedContentKeys();
  const timestamp = getCacheTimestamp();

  return {
    featuresCount: features?.length ?? 0,
    contentKeysCount: contentKeys.length,
    timestamp,
  };
}
