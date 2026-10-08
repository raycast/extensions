import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getListViews } from "../api";
import { apiLimit } from "../utils";

export function useListViews(spaceId: string, listId: string) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (spaceId: string, listId: string) => async (options: { page: number }) => {
      const offset = options.page * apiLimit;
      const response = await getListViews(spaceId, listId, { offset, limit: apiLimit });

      return {
        data: response.views,
        hasMore: response.pagination.has_more,
      };
    },
    [spaceId, listId],
    {
      keepPreviousData: true,
      execute: !!spaceId && !!listId,
    },
  );

  // filter empty data to prevent flickering at the bottom
  const filteredData = useMemo(() => data?.filter((view) => view) || [], [data]);

  return {
    views: filteredData,
    viewsError: error,
    isLoadingViews: isLoading,
    mutateViews: mutate,
    viewsPagination: pagination,
  };
}
