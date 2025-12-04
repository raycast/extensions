import type { GoogleBooksResponse, VolumeItem } from "../types/google-books.dt";
import { useFetch } from "@raycast/utils";

type UseSearchReturn = { items: VolumeItem[]; loading: boolean };

function useSearch(query: string | undefined): UseSearchReturn {
  const { isLoading, data } = useFetch(`https://www.googleapis.com/books/v1/volumes?q=${query}&maxResults=40`, {
    mapResult(result: GoogleBooksResponse) {
      return {
        data: result.items,
      };
    },
    initialData: [],
    execute: !!query,
  });
  return { loading: isLoading, items: data };
}

export { useSearch };
