import { usePromise } from "@raycast/utils";
import { getUserBook } from "../api/books";

export default function useGetUserBook(book_id: number, user_id: number) {
  const { data, isLoading, mutate } = usePromise(() => getUserBook(book_id, user_id));

  return { book: data, isBookLoading: isLoading, mutateBook: mutate };
}
