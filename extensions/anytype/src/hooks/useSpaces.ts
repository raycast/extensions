import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getSpaces } from "../api";
import { apiLimit } from "../utils";

export function useSpaces(searchText?: string) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (searchText?: string) => async (options: { page: number }) => {
      const offset = options.page * apiLimit;
      const response = await getSpaces({ offset, limit: apiLimit, name: searchText });

      return {
        data: response.spaces,
        hasMore: response.pagination.has_more,
      };
    },
    [searchText],
    {
      keepPreviousData: true,
    },
  );

  // filter empty data to prevent flickering at the bottom
  const filteredData = useMemo(() => data?.filter((space) => space) || [], [data]);

  return {
    spaces: filteredData,
    spacesError: error,
    isLoadingSpaces: isLoading,
    mutateSpaces: mutate,
    spacesPagination: pagination,
  };
}
