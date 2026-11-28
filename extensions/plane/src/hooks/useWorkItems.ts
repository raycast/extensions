import { useCachedPromise } from "@raycast/utils";
import { searchWorkItems } from "../api/work-items";
import { planeClient } from "../api/auth";
import { errorShownInline } from "../helpers/errors";

export function useWorkItems(searchText: string, projectId?: string) {
  const query = searchText.trim();
  const { data, error, isLoading, mutate, revalidate } = useCachedPromise(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the slug only scopes the cache key
    (searchText: string, projectId?: string, _workspaceSlug?: string) => searchWorkItems({ searchText, projectId }),
    [query, projectId, planeClient?.workspaceSlug],
    {
      // The search endpoint returns nothing for an empty query; don't spend a request on it.
      execute: query.length > 0,
      keepPreviousData: true,
      onError: errorShownInline,
    },
  );
  return {
    workItems: query.length > 0 ? data || [] : [],
    error,
    isLoading: query.length > 0 && isLoading,
    mutate,
    revalidate,
  };
}
