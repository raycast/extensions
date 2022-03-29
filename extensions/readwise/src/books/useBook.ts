import useSWR from "swr";

import { useHandleError } from "../hooks/useHandleError";
import { fetchReadwise } from "../api";
import { Book } from "./types";

export function useBook(bookId: number) {
  const { data, error, isValidating } = useSWR<Book, HTTPError>(`/v2/books/${bookId}`, fetchReadwise);
  useHandleError(error);

  return {
    data,
    loading: (!data && !error) || isValidating,
  };
}
