import queryString from "query-string";

import { BookParameters, BookResponse } from "./types";
import { useListApi } from "../api/useApi";

export const BASE_URL = "/v2/books";

export function useBooks() {
  const { data, loading, setParams, defaultParams } = useListApi<BookResponse, BookParameters>(BASE_URL);

  return {
    data,
    loading,
    refetch: async (parameters: string) => {
      setParams({
        ...defaultParams,
        ...queryString.parse(parameters),
      });
    },
  };
}
