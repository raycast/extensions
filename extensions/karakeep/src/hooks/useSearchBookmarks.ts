import { usePromise } from "@raycast/utils";
import { fetchSearchBookmarks } from "../apis";

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
    },
  );

  return { isLoading, bookmarks: data?.bookmarks || [], hasMore: data?.hasMore || false, error, revalidate };
}
