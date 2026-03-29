import { useFetch } from "@raycast/utils";
import type { ListPostsResponse } from "../lib/notra";
import {
  getCachedValue,
  getNotraRequestInit,
  getPostsCacheKey,
  mapPost,
  NOTRA_API_URL,
  setCachedValue,
} from "../lib/notra";
import type { ContentTypeFilter, Post } from "../types";

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
