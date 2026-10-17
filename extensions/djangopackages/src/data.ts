import {
  fetchCategories,
  fetchCategoryByUrl,
  fetchGridByUrl,
  fetchPackageDetail,
  searchPackages,
} from "./api";
import { getCachedValue, setCachedValue } from "./cache";
import { FIFTEEN_MINUTES_MS, MAX_SEARCH_RESULTS, SIX_HOURS_MS, TWELVE_HOURS_MS } from "./constants";
import {
  ApiPackageDetail,
  CategorySummary,
  GridSummary,
  PackageDetail,
  SearchResponseItem,
} from "./types";

const CATEGORY_CACHE_KEY = "categories";
const SEARCH_CACHE_PREFIX = "search:";
const PACKAGE_CACHE_PREFIX = "package:";
const CATEGORY_DETAIL_CACHE_PREFIX = "category-detail:";
const GRID_DETAIL_CACHE_PREFIX = "grid-detail:";

function buildCacheKey(prefix: string, raw: string): string {
  return `${prefix}${encodeURIComponent(raw)}`;
}

export async function getCategories(forceRefresh = false): Promise<CategorySummary[]> {
  if (!forceRefresh) {
    const cached = await getCachedValue<CategorySummary[]>(CATEGORY_CACHE_KEY);
    if (cached) {
      return cached;
    }
  }

  const fresh = await fetchCategories();
  await setCachedValue(CATEGORY_CACHE_KEY, fresh, TWELVE_HOURS_MS);
  return fresh;
}

export async function getSearchResults(
  query: string,
  forceRefresh = false,
): Promise<SearchResponseItem[]> {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return [];
  }

  const cacheKey = buildCacheKey(SEARCH_CACHE_PREFIX, normalizedQuery);

  if (!forceRefresh) {
    const cached = await getCachedValue<SearchResponseItem[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const fresh = await searchPackages(normalizedQuery);
  const uniqueResults = dedupeSearchResults(fresh);
  const limited = uniqueResults.slice(0, MAX_SEARCH_RESULTS);
  await setCachedValue(cacheKey, limited, FIFTEEN_MINUTES_MS);
  return limited;
}

export async function getPackageDetailWithCache(
  slug: string,
  forceRefresh = false,
): Promise<PackageDetail> {
  const cacheKey = buildCacheKey(PACKAGE_CACHE_PREFIX, slug);

  if (!forceRefresh) {
    const cached = await getCachedValue<PackageDetail>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const fresh = await fetchPackageDetail(slug);
  const normalized = normalizePackageDetail(fresh);
  await setCachedValue(cacheKey, normalized, SIX_HOURS_MS);
  return normalized;
}

export function buildPackageUrl(slug: string): string {
  return `https://djangopackages.org/packages/p/${slug}/`;
}

async function getCachedResource<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttlMs: number,
): Promise<T> {
  const cached = await getCachedValue<T>(cacheKey);
  if (cached) {
    return cached;
  }

  const fresh = await fetcher();
  await setCachedValue(cacheKey, fresh, ttlMs);
  return fresh;
}

export async function getCategoryDetailByUrl(url: string): Promise<CategorySummary> {
  return getCachedResource(
    buildCacheKey(CATEGORY_DETAIL_CACHE_PREFIX, url),
    () => fetchCategoryByUrl(url),
    TWELVE_HOURS_MS,
  );
}

export async function getGridDetailByUrl(url: string): Promise<GridSummary> {
  return getCachedResource(
    buildCacheKey(GRID_DETAIL_CACHE_PREFIX, url),
    () => fetchGridByUrl(url),
    TWELVE_HOURS_MS,
  );
}

function normalizePackageDetail(detail: ApiPackageDetail): PackageDetail {
  const participants = detail.participants;
  let normalizedParticipants: string[] | undefined;
  if (typeof participants === "string") {
    normalizedParticipants = participants
      .split(/,|\n/)
      .map((part) => part.trim())
      .filter(Boolean);
  } else if (Array.isArray(participants)) {
    normalizedParticipants = participants
      .map((part) => part?.trim())
      .filter((part): part is string => Boolean(part));
  }

  return {
    ...detail,
    participants: normalizedParticipants,
  };
}

// Removes duplicate packages based on slug to keep UI keys stable.
function dedupeSearchResults(results: SearchResponseItem[]): SearchResponseItem[] {
  const seen = new Set<string>();
  return results.filter((item) => {
    const slugKey = item.slug.toLowerCase();
    if (seen.has(slugKey)) {
      return false;
    }
    seen.add(slugKey);
    return true;
  });
}
