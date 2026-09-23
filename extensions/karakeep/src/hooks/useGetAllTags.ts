import { useCachedPromise } from "@raycast/utils";
import { fetchGetAllTags } from "../apis";
import { handleFetchError } from "../utils/fetchError";
import { useLiveData } from "./useLiveData";
import { ApiResponse, Tag } from "../types";

/**
 * @param execute set false to hold the fetch until the API is known to be
 * reachable — used by the create forms, which shouldn't fire doomed requests
 * while showing their own offline notice.
 */
export function useGetAllTags(execute = true) {
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async () => {
      const result = (await fetchGetAllTags()) as ApiResponse<Tag>;
      return result.tags || [];
    },
    [],
    {
      execute,
      onError: handleFetchError("tags"),
    },
  );

  const hasLiveData = useLiveData(isLoading, error);

  return {
    isLoading,
    tags: data || [],
    error,
    hasLiveData,
    revalidate,
  };
}
