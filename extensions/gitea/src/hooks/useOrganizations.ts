import { getOrganizations } from "../api/organizations";
import { CacheKey, DEFAULT_PAGE_SIZE } from "../constants";
import { usePaginatedCachedPromise } from "./usePaginatedCachedPromise";

export function useOrganizations() {
  return usePaginatedCachedPromise({
    cacheKey: CacheKey.Organizations,
    errorTitle: "Couldn't retrieve organizations",
    pageSize: DEFAULT_PAGE_SIZE,
    args: [] as const,
    fetchPage: (page) =>
      getOrganizations({
        page,
        limit: DEFAULT_PAGE_SIZE,
      }),
  });
}
