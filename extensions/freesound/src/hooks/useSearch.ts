import { useFetch } from "@raycast/utils";

import type { FieldFilterKey, SearchOptions, SoundInstance, SoundSearchResponse } from "@/types";

import { getAuthHeaders, getSearchUrl } from "@/lib/api";

const useSearch = (query: string, opts: SearchOptions = {}, fields?: FieldFilterKey[]) => {
  const headers = getAuthHeaders();

  return useFetch<SoundSearchResponse, SoundInstance[], SoundInstance[]>(
    (pagination) => {
      const page = pagination.page + 1;
      const url = getSearchUrl(query, opts, { page_size: 20, page, fields });
      return url;
    },
    {
      headers,
      execute: query.length > 0,
      keepPreviousData: true,
      initialData: [],
      mapResult(result) {
        const data = result.results;
        return {
          data,
          hasMore: result.next !== null,
        };
      },
    },
  );
};

export default useSearch;
