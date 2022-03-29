import queryString from "query-string";

import { BookParameters, BookResponse } from "./types";
import { useListApi, DEFAULT_LIST_PARAMS } from "../api/useApi";

export function useBooks() {
  const { data, loading, setParams } = useListApi<BookResponse, BookParameters>("/v2/books", DEFAULT_LIST_PARAMS);

  return {
    data,
    loading,
    refetch: async (parameters: string) => {
      setParams({
        ...DEFAULT_LIST_PARAMS,
        ...queryString.parse(parameters),
      });
    },
  };
}
