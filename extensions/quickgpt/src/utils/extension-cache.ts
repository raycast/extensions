import { Cache } from "@raycast/api";

// Keep a single reader for the pre-namespace cache so existing user state can
// be migrated without multiple Cache instances racing to rewrite its journal.
const legacyExtensionCache = new Cache();
const LEGACY_MIGRATION_KEY = "__legacy_cache_migrated_v1";

export function createNamespacedCache(namespace: string, legacyKeys: readonly string[] = []): Cache {
  const cache = new Cache({ namespace });

  if (legacyKeys.length === 0 || cache.has(LEGACY_MIGRATION_KEY)) {
    return cache;
  }

  for (const key of legacyKeys) {
    if (cache.has(key)) {
      continue;
    }

    const legacyValue = legacyExtensionCache.get(key);
    if (legacyValue !== undefined) {
      cache.set(key, legacyValue);
    }
  }

  cache.set(LEGACY_MIGRATION_KEY, "1");

  return cache;
}
