import { getRepositories } from "../services/repositories";
import { CacheKey, DEFAULT_PAGE_SIZE } from "../constants";
import { RepositorySort, mapRepositorySortToGitea } from "../domain/repository-sort";
import type { Repository } from "../types/api";
import { usePaginatedResource } from "./usePaginatedResource";
import { useCurrentUser } from "./useCurrentUser";

/**
 * Hook for fetching repositories accessible to the authenticated user.
 */
export function useUserRepositories(sort?: RepositorySort, query?: string) {
  const normalizedQuery = query?.trim() || undefined;
  const { user, isLoading: isLoadingUser } = useCurrentUser();
  const result = usePaginatedResource<Repository, { sort?: RepositorySort; query?: string; uid?: number }>({
    cacheKey: CacheKey.UserRepositories,
    errorTitle: "Couldn't retrieve repositories",
    pageSize: DEFAULT_PAGE_SIZE,
    params: { sort, query: normalizedQuery, uid: user?.id },
    fetchPage: async ({ sort: repositorySort, query: searchQuery, uid, page, limit }) => {
      const { sort: giteaSort, order: giteaOrder } = mapRepositorySortToGitea(
        repositorySort ?? RepositorySort.RecentlyUpdated,
      );

      if (!uid) {
        return { items: [], hasMore: false };
      }

      return getRepositories({
        limit,
        page,
        q: searchQuery,
        uid,
        exclusive: false,
        sort: giteaSort,
        order: giteaOrder,
      });
    },
  });

  return { ...result, isLoading: result.isLoading || isLoadingUser };
}
