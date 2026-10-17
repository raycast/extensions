import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getProperties } from "../api";
import { apiLimit } from "../utils/constant";

export function useProperties(spaceId: string, searchText?: string, config?: { execute: boolean }) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (spaceId: string, searchText?: string) => async (options: { page: number }) => {
      const offset = options.page * apiLimit;
      const response = await getProperties(spaceId, { offset, limit: apiLimit, name: searchText });

      return {
        data: response.properties,
        hasMore: response.pagination.has_more,
      };
    },
    [spaceId, searchText],
    {
      keepPreviousData: true,
      execute: !!spaceId && config?.execute !== false,
    },
  );

  // filter empty data to prevent flickering at the bottom
  const filteredData = useMemo(() => data?.filter((property) => property) || [], [data]);

  return {
    properties: filteredData,
    propertiesError: error,
    isLoadingProperties: isLoading,
    mutateProperties: mutate,
    propertiesPagination: pagination,
  };
}
