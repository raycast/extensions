import { usePromise } from "@raycast/utils";
import { fetchSearchBookmarks } from "../apis";
import { handleFetchError } from "../utils/fetchError";
import { getTranslator } from "../i18n/standalone";
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

      // fetchWithAuth accepts any 2xx body, and a 204 or a proxy's empty
      // response would make this chain throw a TypeError that reads as a bug
      // in the extension rather than as a bad response.
      const payload = (result as SearchResult | undefined)?.[0]?.result?.data?.json;
      // Shape, not just presence: a 2xx body with `bookmarks` as an object, or
      // with no `nextCursor` at all, passed an existence check and then either
      // broke rendering or paginated forever against a cursor that never came.
      if (!payload || !Array.isArray(payload.bookmarks) || !("nextCursor" in payload)) {
        throw new Error(getTranslator()("bookmarkList.searchResponseInvalid"));
      }

      return {
        bookmarks: payload.bookmarks,
        hasMore: payload.nextCursor !== null,
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
