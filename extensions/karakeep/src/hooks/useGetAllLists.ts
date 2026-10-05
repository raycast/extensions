import { useCachedPromise } from "@raycast/utils";
import { fetchGetAllLists } from "../apis";
import { handleFetchError } from "../utils/fetchError";
import { useLiveData } from "./useLiveData";

/**
 * @param execute set false to hold the fetch until the API is known to be
 * reachable — used by the create forms, which shouldn't fire doomed requests
 * while showing their own offline notice.
 *
 * This deliberately does NOT report a per-list bookmark count. The API has no
 * count field and no stats endpoint, so the only way to get one is to fetch
 * each list's bookmarks — one request per list, on every command with a list
 * dropdown — and the result was still wrong, capped at the page size.
 */
export function useGetAllLists(execute = true) {
  const { isLoading, data, error, revalidate } = useCachedPromise(
    async () => {
      const result = await fetchGetAllLists();
      return result.lists || [];
    },
    [],
    { execute, onError: handleFetchError("lists") },
  );

  const hasLiveData = useLiveData(isLoading, error);

  return {
    isLoading,
    lists: data || [],
    error,
    hasLiveData,
    revalidate,
  };
}
