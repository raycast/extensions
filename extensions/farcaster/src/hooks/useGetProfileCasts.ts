import { useFetch } from "@raycast/utils";
import { Cast, FeedCastsResponse } from "../utils/types";
import { ApiUrls } from "../utils/endpoints";
import { Toast, showToast } from "@raycast/api";
import { headers } from "../utils/helpers";

/** includes casts and recasts by the author */
export function useGetProfileCasts(fids: number) {
  return useFetch<FeedCastsResponse>(({ cursor }) => ApiUrls.getProfileCasts(fids, cursor), {
    method: "GET",
    headers: headers,
    execute: !!fids,
    keepPreviousData: true,
    onError: (error: Error) => {
      console.error(error);
      showToast(Toast.Style.Failure, `Could not fetch profile casts`);
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
