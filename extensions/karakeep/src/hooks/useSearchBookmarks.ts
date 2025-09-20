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
    async () => {
      const result = await fetchSearchBookmarks(searchText);
      const hasMore = (result as SearchResult)[0].result.data.json.nextCursor !== null;
      return {
        bookmarks: (result as SearchResult)[0].result.data.json.bookmarks,
        hasMore,
      };
    },
    [],
    {
      execute: true,
    },
  );

  return { isLoading, bookmarks: data?.bookmarks || [], hasMore: data?.hasMore || false, error, revalidate };
}
