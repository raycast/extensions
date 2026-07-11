import { usePromise } from "@raycast/utils";
import { getUserBook } from "../api/books";

export default function useGetUserBook(bookId: number, userId: number) {
  const { data, isLoading, mutate } = usePromise(() => getUserBook(bookId, userId));

  return { book: data, isBookLoading: isLoading, mutateBook: mutate };
}
