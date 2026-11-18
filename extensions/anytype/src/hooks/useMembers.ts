import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getMembers } from "../api";
import { apiLimit } from "../utils";

export function useMembers(spaceId: string, searchText?: string) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (spaceId: string, searchText?: string) => async (options: { page: number }) => {
      const offset = options.page * apiLimit;
      const response = await getMembers(spaceId, { offset, limit: apiLimit, name: searchText });

      return {
        data: response.members,
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
  const filteredData = useMemo(() => data?.filter((member) => member) || [], [data]);

  return {
    members: filteredData,
    membersError: error,
    isLoadingMembers: isLoading,
    mutateMembers: mutate,
    membersPagination: pagination,
  };
}
