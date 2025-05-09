import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getProperties } from "../api";
import { apiLimit } from "../utils/constant";

export function useProperties(spaceId: string) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (spaceId: string) => async (options: { page: number }) => {
      const offset = options.page * apiLimit;
      const response = await getProperties(spaceId, { offset, limit: apiLimit });

      return {
        data: response.properties,
        hasMore: response.pagination.has_more,
      };
    },
    [spaceId],
    {
      keepPreviousData: true,
      execute: !!spaceId,
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
