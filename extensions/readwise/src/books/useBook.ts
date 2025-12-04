import { useDetailApi } from "../api/useApi";
import { Book } from "./types";

export function useBook(bookId: number) {
  const { data, loading } = useDetailApi<Book>(`/v2/books/${bookId}`);

  return {
    data,
    loading,
  };
}
