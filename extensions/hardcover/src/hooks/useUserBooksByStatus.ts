import { usePromise } from "@raycast/utils";
import { getUserBooksByStatus } from "../api/books";

export default function useUserBooksByStatus(statusId: number) {
  const { data, isLoading, mutate } = usePromise(() => getUserBooksByStatus(statusId));

  return { userBooks: data || [], isUserBooksLoading: isLoading, mutateUserBooks: mutate };
}
