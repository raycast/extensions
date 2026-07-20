import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getTypes } from "../api";
import { apiLimit } from "../utils";

export function useTypes(spaceId: string, searchText?: string) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (spaceId: string, searchText?: string) => async (options: { page: number }) => {
      const offset = options.page * apiLimit;
      const response = await getTypes(spaceId, { offset, limit: apiLimit, name: searchText });

      return {
        data: response.types,
        hasMore: response.pagination.has_more,
      };
    },
    [spaceId, searchText],
    {
      keepPreviousData: true,
      execute: !!spaceId,
    },
  );

  // filter empty data to prevent flickering at the bottom
  const filteredData = useMemo(() => data?.filter((type) => type) || [], [data]);

  return {
    types: filteredData,
    typesError: error,
    isLoadingTypes: isLoading,
    mutateTypes: mutate,
    typesPagination: pagination,
  };
}
