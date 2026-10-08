import { useFetch } from "@raycast/utils";
import { getNotraRequestInit, mapPost, NOTRA_API_URL } from "../lib/notra";
import type { ContentTypeFilter, ListPostsResponse, Post } from "../types";
import { getCachedValue, getPostsCacheKey, setCachedValue } from "../utils";

const PAGE_SIZE = 20;

export function usePosts(contentType: ContentTypeFilter) {
  const cacheKey = getPostsCacheKey(contentType);

  return useFetch<ListPostsResponse, Post[], Post[]>(
    (options) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(options.page + 1),
      });

      params.append("status", "draft");
      params.append("status", "published");

      if (contentType !== "all") {
        params.append("contentType", contentType);
      }

      return `${NOTRA_API_URL}/v1/posts?${params.toString()}`;
    },
    {
      ...getNotraRequestInit(),
      initialData: getCachedValue<Post[]>(cacheKey) ?? [],
      keepPreviousData: true,
      onData(data) {
        setCachedValue(cacheKey, data);
      },
      mapResult(result) {
        return {
          data: result.posts.map(mapPost),
          hasMore: result.pagination.nextPage !== null,
        };
      },
    },
  );
}
