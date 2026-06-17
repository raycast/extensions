import { useCachedPromise } from "@raycast/utils";
import { fetchGetAllTags } from "../apis";
import { ApiResponse, Tag } from "../types";

export function useGetAllTags() {
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async () => {
      const result = (await fetchGetAllTags()) as ApiResponse<Tag>;
      return result.tags || [];
    },
    [],
    {
      execute: true,
    },
  );

  return {
    isLoading,
    tags: data || [],
    error,
    revalidate,
  };
}
