import queryString from "query-string";

import { useListApi } from "../api/useApi";

export function useTags() {
  const { data, loading, setParams } = useListApi<TagsRequest, TagParameters>("/v2/all_highlight_tags");

  return {
    data,
    loading: loading,
    refetch: async (pageUrl: string) => {
      setParams(queryString.parse(new URL(pageUrl).search));
    },
  };
}
