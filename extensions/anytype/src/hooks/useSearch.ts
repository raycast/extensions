import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { search } from "../api";
import { SortDirection } from "../models";
import { apiLimit } from "../utils";

export function useSearch(spaceId: string, query: string, types: string[]) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (spaceId: string, query: string, types: string[]) => async (options: { page: number }) => {
      const offset = options.page * apiLimit;
      const sortPreference = getPreferenceValues().sort;
      const sortDirection = sortPreference === "name" ? SortDirection.Ascending : SortDirection.Descending;

      const response = await search(
        spaceId,
        { query, types, sort: { property: sortPreference, direction: sortDirection } },
        { offset, limit: apiLimit },
      );

      return {
        data: response.data,
        hasMore: response.pagination.has_more,
      };
    },
    [spaceId, query, types],
    {
      keepPreviousData: true,
      execute: !!spaceId,
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
