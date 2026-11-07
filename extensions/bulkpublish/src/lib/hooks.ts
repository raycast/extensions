import { useFetch } from "@raycast/utils";
import { useMemo } from "react";
import { authHeaders, channelsFromResponse, parseResponse, PostQuery, postsFromResponse, postsUrl, url } from "./api";
import { Channel } from "./core";

export function useChannels() {
  const res = useFetch(url("/api/channels"), {
    headers: authHeaders(),
    parseResponse,
    mapResult: (data: unknown) => ({ data: channelsFromResponse(data) }),
    keepPreviousData: true,
    initialData: [] as Channel[],
  });
  const names = useMemo(() => new Map(res.data.map((c) => [c.id, c.name])), [res.data]);
  return { ...res, channels: res.data, names };
}

/** Posts, a page at a time, for List pagination. */
export function usePosts(q: Omit<PostQuery, "page">) {
  return useFetch((options) => postsUrl({ ...q, page: options.page + 1 }), {
    headers: authHeaders(),
    parseResponse,
    mapResult: (data: unknown) => {
      const page = postsFromResponse(data);
      return { data: page.posts, hasMore: page.page < page.totalPages };
    },
    keepPreviousData: true,
    initialData: [],
  });
}
