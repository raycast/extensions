import { youtube_v3 } from "@googleapis/youtube";
import { List, showToast, ToastStyle } from "@raycast/api";
import { GaxiosResponse } from "googleapis-common";
import { useState } from "react";
import { getErrorMessage } from "./lib/utils";
import { useRefresher, youtubeClient } from "./lib/youtubeapi";

export default function VideoList() {
  const [searchText, setSearchText] = useState<string>();
  const { data, error, isLoading, fetcher } = useRefresher<
    GaxiosResponse<youtube_v3.Schema$SearchListResponse> | undefined
  >(
    async (updateInline: boolean) => {
      if (searchText) {
        return await youtubeClient.search.list({ q: searchText, part: ["id", "snippet"] });
      }
      return undefined;
    },
    [searchText]
  );
  if (error) {
    showToast(ToastStyle.Failure, "Could not search videos", getErrorMessage(error));
  }
  if (data && data.data && data.data.items) {
    for (const r of data.data.items) {
      console.log(r.snippet);
    }
  }
  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle={true}>
      {data?.data.items?.map((r) => (
        <List.Item
          key={r.id?.videoId?.toString()}
          title={r.snippet?.title || "?"}
          icon={r.snippet?.thumbnails?.default?.url || undefined}
        />
      ))}
    </List>
  );
}
