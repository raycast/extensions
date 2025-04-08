import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getObjectsInList } from "../api";
import { apiLimit } from "../utils";

export function useObjectsInList(spaceId: string, listId: string, viewId: string) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (spaceId: string, listId: string, viewId: string) => async (options: { page: number }) => {
      const offset = options.page * apiLimit;
      const response = await getObjectsInList(spaceId, listId, viewId, { offset, limit: apiLimit });

      return {
        data: response.objects,
        hasMore: response.pagination.has_more,
      };
    },
    [spaceId, listId, viewId],
    {
      keepPreviousData: true,
      execute: !!viewId,
    },
  );

  // filter empty data to prevent flickering at the bottom
  const filteredData = useMemo(() => data?.filter((object) => object) || [], [data]);

  return {
    objects: filteredData,
    objectsError: error,
    isLoadingObjects: isLoading,
    mutateObjects: mutate,
    objectsPagination: pagination,
  };
}
