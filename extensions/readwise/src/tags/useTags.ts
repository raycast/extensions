import queryString from "query-string";

import { useListApi } from "../api/useApi";

export const BASE_URL = "/v2/all_highlight_tags";

export function useTags() {
  const { data, loading, setParams, defaultParams } = useListApi<TagsRequest, TagParameters>(BASE_URL);

  return {
    data,
    loading: loading,
    refetch: async (pageUrl: string) => {
      setParams({
        ...defaultParams,
        ...queryString.parse(new URL(pageUrl, "https://readwise.io").search),
      });
    },
  };
}
