import { usePromise } from "@raycast/utils";
import { fetchSearchBookmarks } from "../apis";

interface SearchResult {
  [key: string]: {
    result: {
      data: {
        json: {
          bookmarks: [];
        };
      };
    };
  };
}

export function useSearchBookmarks(searchText: string) {
  const {
    isLoading,
    data: bookmarks,
    error,
    revalidate,
  } = usePromise(
    async () => {
      const result = await fetchSearchBookmarks(searchText);
      return (result as SearchResult)[0].result.data.json.bookmarks;
    },
    [],
    {
      execute: !!searchText,
    },
  );

  return { isLoading, bookmarks: bookmarks || [], error, revalidate };
}
