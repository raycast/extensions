import { usePromise } from "@raycast/utils";
import { getListBooks } from "../api/books";

export default function useListBooks() {
  const { data, isLoading, mutate } = usePromise(() => getListBooks());

  return { listBooks: data, isListBooksLoading: isLoading, mutateListBooks: mutate };
}
