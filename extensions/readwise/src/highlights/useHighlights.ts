import queryString from "query-string";

import { useListApi } from "../api/useApi";

export const BASE_URL = "/v2/highlights";

export function useHighlights() {
  const { data, loading, setParams, defaultParams } = useListApi<HighlightsResponse, HighlightParameters>(BASE_URL);

  return {
    data,
    loading,
    refetch: async (pageUrl: string) => {
      setParams({
        ...defaultParams,
        ...queryString.parse(new URL(pageUrl, "https://readwise.io").search),
      });
    },
  };
}
