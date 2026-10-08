import { getRepositories } from "../services/repositories";
import { CacheKey, DEFAULT_PAGE_SIZE } from "../constants";
import { RepositorySort, mapRepositorySortToGitea } from "../domain/repository-sort";
import { usePaginatedResource } from "./usePaginatedResource";

export function useRepositories(sort?: RepositorySort, query?: string) {
  const normalizedQuery = query?.trim() || undefined;

  return usePaginatedResource({
    cacheKey: CacheKey.Repositories,
    errorTitle: "Couldn't retrieve repositories",
    pageSize: DEFAULT_PAGE_SIZE,
    params: { sort, query: normalizedQuery },
    fetchPage: ({ sort: repositorySort, query: searchQuery, page, limit }) => {
      const { sort: giteaSort, order: giteaOrder } = mapRepositorySortToGitea(
        repositorySort ?? RepositorySort.MostStars,
      );

      return getRepositories({
        limit,
        page,
        q: searchQuery,
        sort: giteaSort,
        order: giteaOrder,
      });
    },
  });
}
