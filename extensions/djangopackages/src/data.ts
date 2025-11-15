import {
  fetchCategories,
  fetchCategoryByUrl,
  fetchGridByUrl,
  fetchPackageDetail,
  searchPackages,
} from "./api";
import { getCachedValue, setCachedValue } from "./cache";
import { CategorySummary, GridSummary, PackageDetail, SearchResponseItem } from "./types";

const CATEGORY_CACHE_KEY = "categories";
const SEARCH_CACHE_PREFIX = "search:";
const PACKAGE_CACHE_PREFIX = "package:";
const CATEGORY_DETAIL_CACHE_PREFIX = "category-detail:";
const GRID_DETAIL_CACHE_PREFIX = "grid-detail:";

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const TWELVE_HOURS = 12 * 60 * 60 * 1000;
const SIX_HOURS = 6 * 60 * 60 * 1000;

export async function getCategories(forceRefresh = false): Promise<CategorySummary[]> {
  if (!forceRefresh) {
    const cached = await getCachedValue<CategorySummary[]>(CATEGORY_CACHE_KEY);
    if (cached) {
      return cached;
    }
  }

  const fresh = await fetchCategories();
  await setCachedValue(CATEGORY_CACHE_KEY, fresh, TWELVE_HOURS);
  return fresh;
}

export async function getSearchResults(
  query: string,
  forceRefresh = false,
): Promise<SearchResponseItem[]> {
  const cacheKey = `${SEARCH_CACHE_PREFIX}${query.toLowerCase()}`;

  if (!forceRefresh) {
    const cached = await getCachedValue<SearchResponseItem[]>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const fresh = await searchPackages(query);
  await setCachedValue(cacheKey, fresh, FIFTEEN_MINUTES);
  return fresh;
}

export async function getPackageDetailWithCache(
  slug: string,
  forceRefresh = false,
): Promise<PackageDetail> {
  const cacheKey = `${PACKAGE_CACHE_PREFIX}${slug}`;

  if (!forceRefresh) {
    const cached = await getCachedValue<PackageDetail>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const fresh = await fetchPackageDetail(slug);
  await setCachedValue(cacheKey, fresh, SIX_HOURS);
  return fresh;
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
    `${CATEGORY_DETAIL_CACHE_PREFIX}${url}`,
    () => fetchCategoryByUrl(url),
    TWELVE_HOURS,
  );
}

export async function getGridDetailByUrl(url: string): Promise<GridSummary> {
  return getCachedResource(
    `${GRID_DETAIL_CACHE_PREFIX}${url}`,
    () => fetchGridByUrl(url),
    TWELVE_HOURS,
  );
}
