import { useFetch } from "@raycast/utils";
import { Cast, FeedCastsResponse } from "../utils/types";
import { ApiUrls } from "../utils/endpoints";
import { Toast, showToast } from "@raycast/api";
import { headers } from "../utils/helpers";

export function useTrendingCasts(timeWindow: string) {
  return useFetch<FeedCastsResponse>(({ cursor }) => ApiUrls.getTrendingCasts(timeWindow, cursor), {
    method: "GET",
    headers: headers,
    execute: !!timeWindow,
    keepPreviousData: true,
    onError: (error: Error) => {
      console.error(error);
      showToast(Toast.Style.Failure, "Could not fetch trending casts");
    },
    mapResult(result: FeedCastsResponse) {
      return {
        data: result?.casts as Cast[],
        hasMore: !!result.next.cursor,
        cursor: result?.next.cursor,
      };
    },
  });
}
