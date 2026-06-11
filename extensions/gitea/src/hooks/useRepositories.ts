import { getRepositories } from "../services/repositories";
import { CacheKey, DEFAULT_PAGE_SIZE } from "../constants";
import { RepositorySort, mapRepositorySortToGitea } from "../domain/repository-sort";
import { usePaginatedResource } from "./usePaginatedResource";

export function useRepositories(sort?: RepositorySort) {
  return usePaginatedResource({
    cacheKey: CacheKey.Repositories,
    errorTitle: "Couldn't retrieve repositories",
    pageSize: DEFAULT_PAGE_SIZE,
    params: { sort },
    fetchPage: ({ sort: repositorySort, page, limit }) => {
      const { sort: giteaSort, order: giteaOrder } = mapRepositorySortToGitea(
        repositorySort ?? RepositorySort.MostStars,
      );

      return getRepositories({
        limit,
        page,
        sort: giteaSort,
        order: giteaOrder,
      });
    },
  });
}
