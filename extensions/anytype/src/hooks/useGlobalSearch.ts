import { getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { globalSearch } from "../api";
import { SortDirection } from "../models";
import { apiLimit } from "../utils";

export function useGlobalSearch(query: string, types: string[], config?: { execute?: boolean }) {
  const shouldExecute = config?.execute !== false;
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (query: string, types: string[], shouldExecute: boolean) => async (options: { page: number }) => {
      if (!shouldExecute) {
        return {
          data: [],
          hasMore: false,
        };
      }

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
    [query, types, shouldExecute],
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
