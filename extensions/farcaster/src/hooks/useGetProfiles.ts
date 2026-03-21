import { useFetch } from "@raycast/utils";
import { CastAuthor, FeedUsersResponse } from "../utils/types";
import { ApiUrls } from "../utils/endpoints";
import { Toast, showToast } from "@raycast/api";
import { headers } from "../utils/helpers";

function getProfileByFIDOrUsername(q: string, cursor?: string) {
  let url: string;
  if (/^[0-9]/.test(q)) {
    url = ApiUrls.getUserFid(q, cursor);
  } else {
    url = ApiUrls.getProfilesByUsername(q, cursor);
  }
  return url;
}

export function useGetProfiles(query: string) {
  return useFetch<FeedUsersResponse>(({ cursor }) => getProfileByFIDOrUsername(query, cursor), {
    method: "GET",
    headers: headers,
    execute: !!query,
    keepPreviousData: true,
    onError: (error: Error) => {
      console.error(error);
      showToast(Toast.Style.Failure, "Could not fetch profiles");
    },
    mapResult(result: FeedUsersResponse) {
      const rootResult = result?.result ?? result;
      return {
        data: rootResult?.users as CastAuthor[],
        hasMore: !!rootResult?.next?.cursor,
        cursor: rootResult?.next?.cursor,
      };
    },
  });
}
