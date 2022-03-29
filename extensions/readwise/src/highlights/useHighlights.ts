import queryString from "query-string";

import { useListApi } from "../api/useApi";

export function useHighlights() {
  const { data, loading, setParams } = useListApi<HighlightsResponse, HighlightParameters>("/v2/highlights");

  return {
    data,
    loading,
    refetch: async (pageUrl: string) => {
      setParams(queryString.parse(new URL(pageUrl).search));
    },
  };
}
