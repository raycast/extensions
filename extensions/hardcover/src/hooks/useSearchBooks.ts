import { useCachedPromise } from "@raycast/utils";
import { SearchBook, searchBooks } from "../api/books";
import { UseCachedPromiseReturnType } from "@raycast/utils/dist/types";

export default function useSearchBooks(query: string) {
  return useCachedPromise(
    (query: string) => async (options: { page: number }) => {
      if (!query) {
        return { data: [], hasMore: false };
      }
      const { data, hasMore } = await searchBooks(query, options.page);
      return { data, hasMore };
    },
    [query],
  ) as UseCachedPromiseReturnType<SearchBook[], undefined>;
}
