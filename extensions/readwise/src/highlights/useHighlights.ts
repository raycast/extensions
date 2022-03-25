import { useState } from "react";
import useSWR from "swr";
import queryString from "query-string";

import { fetchReadwise } from "../api";
import { useHandleError } from "../hooks/useHandleError";
import { getPreferences } from "../preferences";

const { pageSize } = getPreferences();

export function useHighlights() {
  const [params, setParams] = useState<HighlightParameters>({
    page_size: pageSize,
  });

  const { data, error, isValidating } = useSWR<HighlightsRequest, HTTPError>(["/v2/highlights", params], fetchReadwise);
  useHandleError(error);

  return {
    data,
    loading: (!data && !error) || isValidating,
    refetch: async (pageUrl: string) => {
      setParams(queryString.parse(new URL(pageUrl).search));
    },
  };
}
