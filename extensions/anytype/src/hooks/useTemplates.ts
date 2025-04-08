import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getTemplates } from "../api";
import { apiLimit } from "../utils";

export function useTemplates(spaceId: string, typeId: string) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (spaceId: string, typeId: string) => async (options: { page: number }) => {
      const offset = options.page * apiLimit;
      const response = await getTemplates(spaceId, typeId, { offset, limit: apiLimit });

      return {
        data: response.templates,
        hasMore: response.pagination.has_more,
      };
    },
    [spaceId, typeId],
    {
      keepPreviousData: true,
    },
  );

  // filter empty data to prevent flickering at the bottom
  const filteredData = useMemo(() => data?.filter((template) => template) || [], [data]);

  return {
    templates: filteredData,
    templatesError: error,
    isLoadingTemplates: isLoading,
    mutateTemplates: mutate,
    templatesPagination: pagination,
  };
}
