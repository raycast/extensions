import { useFetch } from "@raycast/utils";
import type { GetPostResponse } from "../lib/notra";
import {
  getCachedValue,
  getNotraRequestInit,
  getPostCacheKey,
  mapPostDetails,
  NOTRA_API_URL,
  setCachedValue,
} from "../lib/notra";
import type { PostDetails } from "../types";

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
