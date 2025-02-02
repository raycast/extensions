import { useCachedPromise } from "@raycast/utils";
import { getMembers } from "../api/getMembers";
import { useMemo } from "react";
import { apiLimit } from "../helpers/constants";

export function useMembers(spaceId: string) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (spaceId: string) => async (options: { page: number }) => {
      const offset = options.page * apiLimit;
      const response = await getMembers(spaceId, { offset, limit: apiLimit });

      return {
        data: response.members,
        hasMore: response.pagination.has_more,
      };
    },
    [spaceId],
    {
      keepPreviousData: true,
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
