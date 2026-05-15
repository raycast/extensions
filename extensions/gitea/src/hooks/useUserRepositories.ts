import { useMemo } from "react";
import { getUserRepositories } from "../api/repositories";
import { CacheKey, DEFAULT_PAGE_SIZE } from "../constants";
import type { Repository } from "../types/api";
import { RepositorySortOption, SortRepositories } from "../types/sorts/repository-search";
import { usePaginatedCachedPromise } from "./usePaginatedCachedPromise";

export function useUserRepositories(sort?: RepositorySortOption) {
  const result = usePaginatedCachedPromise<Repository, [RepositorySortOption | undefined]>({
    cacheKey: CacheKey.UserRepositories,
    errorTitle: "Couldn't retrieve repositories",
    pageSize: DEFAULT_PAGE_SIZE,
    args: [sort] as [RepositorySortOption | undefined],
    fetchPage: (page) =>
      getUserRepositories({
        limit: DEFAULT_PAGE_SIZE,
        page,
      }),
  });

  const items = useMemo(() => (sort ? SortRepositories(result.items, sort) : result.items), [result.items, sort]);

  return { ...result, items };
}
