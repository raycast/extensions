import { useFetch } from "@raycast/utils";
import { useState } from "react";
import { getNotraRequestInit, mapPost, NOTRA_API_URL } from "../lib/notra";
import type { ContentTypeFilter, ListPostsResponse, Post, WorkspaceScopedOptions } from "../types";
import { getCachedValue, getPostsCacheKey, setCachedValue } from "../utils";

const PAGE_SIZE = 20;

export function usePosts(contentType: ContentTypeFilter, { execute, organizationId }: WorkspaceScopedOptions = {}) {
  const cacheKey = getPostsCacheKey(organizationId, contentType);
  // keepPreviousData smooths content type switches, but must not show another workspace's posts.
  const [dataOrganizationId, setDataOrganizationId] = useState(organizationId);

  const posts = useFetch<ListPostsResponse, Post[], Post[]>(
    (options) => {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        page: String(options.page + 1),
      });

      params.set("status", "draft,published");

      if (contentType !== "all") {
        params.append("contentType", contentType);
      }

      return `${NOTRA_API_URL}/v1/posts?${params.toString()}`;
    },
    {
      ...getNotraRequestInit({ organizationId }),
      execute,
      initialData: getCachedValue<Post[]>(cacheKey) ?? [],
      keepPreviousData: true,
      onData(data) {
        setDataOrganizationId(organizationId);
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

  if (dataOrganizationId !== organizationId) {
    return { ...posts, data: getCachedValue<Post[]>(cacheKey) ?? [] };
  }

  return posts;
}
