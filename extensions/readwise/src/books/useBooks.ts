import { useState } from "react";
import useSWR from "swr";
import queryString from "query-string";

import { BookParameters, BookResponse } from "./types";
import { useHandleError } from "../hooks/useHandleError";
import { fetchReadwise } from "../api";
import { getPreferences } from "../preferences";

const { pageSize } = getPreferences();

const DEFAULT_PARAMS = { page_size: pageSize };

export function useBooks() {
  const [params, setParams] = useState<BookParameters>(DEFAULT_PARAMS);

  const { data, error, isValidating } = useSWR<BookResponse, HTTPError>(["/v2/books", params], fetchReadwise);
  useHandleError(error);

  return {
    data,
    loading: (!data && !error) || isValidating,
    refetch: async (parameters: string) => {
      setParams({
        ...DEFAULT_PARAMS,
        ...queryString.parse(parameters),
      });
    },
  };
}
