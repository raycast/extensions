import { getRepositories } from "../api/repositories";
import { CacheKey, DEFAULT_PAGE_SIZE } from "../constants";
import { RepositorySortOption, mapRepositorySortToGitea } from "../types/sorts/repository-search";
import { usePaginatedCachedPromise } from "./usePaginatedCachedPromise";

export function useRepositories(sort?: RepositorySortOption) {
  return usePaginatedCachedPromise({
    cacheKey: CacheKey.Repositories,
    errorTitle: "Couldn't retrieve repositories",
    pageSize: DEFAULT_PAGE_SIZE,
    args: [sort] as [RepositorySortOption | undefined],
    fetchPage: (page, repositorySort) => {
      const { sort: giteaSort, order: giteaOrder } = mapRepositorySortToGitea(repositorySort ?? "");

      return getRepositories({
        limit: DEFAULT_PAGE_SIZE,
        page,
        sort: giteaSort,
        order: giteaOrder,
      });
    },
  });
}
