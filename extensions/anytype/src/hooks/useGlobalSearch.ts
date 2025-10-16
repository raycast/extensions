import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { globalSearch } from "../api";
import { SortDirection } from "../models";
import { apiLimit } from "../utils";

export function useGlobalSearch(query: string, types: string[]) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (query: string, types: string[]) => async (options: { page: number }) => {
      const offset = options.page * apiLimit;
      const sortPreference = getPreferenceValues().sort;
      const sortDirection = sortPreference === "name" ? SortDirection.Ascending : SortDirection.Descending;

      const response = await globalSearch(
        { query, types, sort: { property_key: sortPreference, direction: sortDirection } },
        { offset, limit: apiLimit },
      );

      return {
        data: response.data,
        hasMore: response.pagination.has_more,
      };
    },
    [query, types],
    {
      keepPreviousData: true,
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
