import { useCachedPromise } from "@raycast/utils";
import { getTypes } from "../api/getTypes";
import { useMemo } from "react";
import { apiLimit } from "../helpers/constants";

export function useTypes(spaceId: string) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (spaceId: string) => async (options: { page: number }) => {
      const offset = options.page * apiLimit;
      const response = await getTypes(spaceId, { offset, limit: apiLimit });

      return {
        data: response.types,
        hasMore: response.pagination.has_more,
      };
    },
    [spaceId],
    {
      execute: !!spaceId,
      keepPreviousData: true,
    },
  );

  // filter empty data to prevent flickering at the bottom
  const filteredData = useMemo(() => data?.filter((type) => type) || [], [data]);

  return {
    types: filteredData,
    typesError: error,
    isLoadingTypes: isLoading && !!spaceId,
    mutateTypes: mutate,
    typesPagination: pagination,
  };
}
