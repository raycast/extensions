import { usePromise } from "@raycast/utils";
import { fetchSearchBookmarks } from "../apis";
import { handleFetchError } from "../utils/fetchError";
import { useLiveData } from "./useLiveData";

interface SearchResult {
  [key: string]: {
    result: {
      data: {
        json: {
          bookmarks: [];
          nextCursor: string | null;
        };
      };
    };
  };
}

export function useSearchBookmarks(searchText: string) {
  const { isLoading, data, error, revalidate } = usePromise(
    async (text: string) => {
      const result = await fetchSearchBookmarks(text);
      const hasMore = (result as SearchResult)[0].result.data.json.nextCursor !== null;
      return {
        bookmarks: (result as SearchResult)[0].result.data.json.bookmarks,
        hasMore,
      };
    },
    [searchText],
    {
      execute: true,
      // usePromise raises the same built-in "Failed to fetch latest data" toast
      // as useCachedPromise; suppress it for connection failures so the
      // recovery UI owns the message.
      onError: handleFetchError("search"),
    },
  );

  const hasLiveData = useLiveData(isLoading, error, searchText);

  return {
    isLoading,
    bookmarks: data?.bookmarks || [],
    hasMore: data?.hasMore || false,
    error,
    hasLiveData,
    revalidate,
  };
}
