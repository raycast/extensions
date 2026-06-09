import { Cache } from "@raycast/api";

import type { FmhyCategory, FmhyIndex, FmhyIndexCache, FmhyRelatedLink, FmhyResult } from "./types";

const CACHE_KEY = "fmhy-index-v4";
const CACHE_VERSION = 4;
const LEGACY_CACHE_VERSION = 3;

export const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const cache = new Cache();

export function readCachedIndex(): FmhyIndexCache | undefined {
  const cached = cache.get(CACHE_KEY);
  if (!cached) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(cached);
    const migrated = migrateLegacyCachePayload(parsed);
    if (migrated) {
      return migrated;
    }

    if (!isCachePayload(parsed)) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
}

export function writeCachedIndex(index: FmhyIndex, timestamp = Date.now()): FmhyIndexCache {
  const payload: FmhyIndexCache = {
    version: CACHE_VERSION,
    timestamp,
    index,
  };

  cache.set(CACHE_KEY, JSON.stringify(payload));
  return payload;
}

export function isCachedIndexFresh(payload: FmhyIndexCache, ttlMs = DEFAULT_CACHE_TTL_MS): boolean {
  if (payload.isLegacy) {
    return false;
  }

  return Date.now() - payload.timestamp < ttlMs;
}

function migrateLegacyCachePayload(value: unknown): FmhyIndexCache | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    value.version !== LEGACY_CACHE_VERSION ||
    typeof value.timestamp !== "number" ||
    !Array.isArray(value.results) ||
    !hasValidResultSamples(value.results)
  ) {
    return undefined;
  }

  return {
    version: CACHE_VERSION,
    timestamp: value.timestamp,
    index: {
      results: value.results,
      categories: getLegacyCategories(value.results),
    },
    isLegacy: true,
  };
}

function getLegacyCategories(results: unknown[]): FmhyCategory[] {
  const categoriesByName = new Map<string, FmhyCategory>();

  for (const result of results) {
    if (!isFmhyResult(result) || !result.category) {
      continue;
    }

    categoriesByName.set(result.category, categoriesByName.get(result.category) ?? { name: result.category });
  }

  return [...categoriesByName.values()];
}

function isCachePayload(value: unknown): value is FmhyIndexCache {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.version === CACHE_VERSION &&
    typeof value.timestamp === "number" &&
    optionalBoolean(value.isLegacy) &&
    isRecord(value.index) &&
    Array.isArray(value.index.results) &&
    Array.isArray(value.index.categories) &&
    hasValidResultSamples(value.index.results) &&
    hasValidCategorySamples(value.index.categories)
  );
}

function hasValidResultSamples(results: unknown[]): boolean {
  return results.length === 0 || (isFmhyResult(results[0]) && isFmhyResult(results[results.length - 1]));
}

function hasValidCategorySamples(categories: unknown[]): boolean {
  return (
    categories.length === 0 || (isFmhyCategory(categories[0]) && isFmhyCategory(categories[categories.length - 1]))
  );
}

function isFmhyResult(value: unknown): value is FmhyResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    optionalString(value.category) &&
    optionalString(value.categoryUrl) &&
    optionalString(value.description) &&
    optionalBoolean(value.isStarred) &&
    optionalBoolean(value.isRedirect) &&
    optionalBoolean(value.isIndex) &&
    optionalArray(value.relatedLinks, isFmhyRelatedLink)
  );
}

function isFmhyCategory(value: unknown): value is FmhyCategory {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.name === "string" &&
    optionalString(value.url) &&
    optionalArray(value.notes, (note): note is string => typeof note === "string")
  );
}

function isFmhyRelatedLink(value: unknown): value is FmhyRelatedLink {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.title === "string" &&
    typeof value.url === "string" &&
    optionalString(value.kind) &&
    optionalString(value.group)
  );
}

function optionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function optionalBoolean(value: unknown): boolean {
  return value === undefined || typeof value === "boolean";
}

function optionalArray<T>(value: unknown, predicate: (item: unknown) => item is T): boolean {
  return value === undefined || (Array.isArray(value) && value.every(predicate));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
