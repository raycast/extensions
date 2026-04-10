import { useFetch } from "@raycast/utils";
import { getNotraRequestInit, mapPostDetails, NOTRA_API_URL } from "../lib/notra";
import type { GetPostResponse, PostDetails } from "../types";
import { getCachedValue, getPostCacheKey, setCachedValue } from "../utils";

export function usePost(postId: string) {
  const cacheKey = getPostCacheKey(postId);

  return useFetch<GetPostResponse, PostDetails, PostDetails>(`${NOTRA_API_URL}/v1/posts/${postId}`, {
    ...getNotraRequestInit(),
    execute: Boolean(postId),
    initialData: getCachedValue<PostDetails>(cacheKey),
    onData(data) {
      setCachedValue(cacheKey, data);
    },
    mapResult(result) {
      return {
        data: mapPostDetails(result),
      };
    },
  });
}
