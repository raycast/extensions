import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
import { getTags } from "../api";
import { apiLimit } from "../utils";

export function useTags(spaceId: string, propertyId: string, searchText?: string, config?: { execute?: boolean }) {
  const { data, error, isLoading, mutate, pagination } = useCachedPromise(
    (spaceId: string, propertyId: string, searchText?: string) => async (options: { page: number }) => {
      const offset = options.page * apiLimit;
      const response = await getTags(spaceId, propertyId, { offset, limit: apiLimit, name: searchText });

      return {
        data: response.tags,
        hasMore: response.pagination.has_more,
      };
    },
    [spaceId, propertyId, searchText],
    {
      keepPreviousData: true,
      execute: !!spaceId && !!propertyId && config?.execute !== false,
    },
  );

  // filter empty data to prevent flickering at the bottom
  const filteredData = useMemo(() => data?.filter((tag) => tag) || [], [data]);

  return {
    tags: filteredData,
    tagsError: error,
    isLoadingTags: isLoading,
    mutateTags: mutate,
    tagsPagination: pagination,
  };
}

export function useTagsMap(spaceId: string, propertyIds: string[]) {
  const { data, error, isLoading, mutate } = useCachedPromise(
    async (spaceId: string, propertyIds: string[]) => {
      const results = await Promise.all(
        propertyIds.map(async (propertyId) => {
          const response = await getTags(spaceId, propertyId, { offset: 0, limit: apiLimit });
          return { propertyId, tags: response.tags };
        }),
      );
      const tagsMap: Record<string, (typeof results)[0]["tags"]> = {};
      results.forEach(({ propertyId, tags }) => {
        tagsMap[propertyId] = tags;
      });
      return tagsMap;
    },
    [spaceId, propertyIds],
    {
      keepPreviousData: true,
      execute: !!spaceId && propertyIds.length > 0,
    },
  );

  return {
    tagsMap: data,
    tagsError: error,
    isLoadingTags: isLoading,
    mutateTags: mutate,
  };
}
