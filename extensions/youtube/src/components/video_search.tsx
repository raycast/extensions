import { List, showToast, ToastStyle } from "@raycast/api";
import { useState } from "react";
import { getErrorMessage } from "../lib/utils";
import { searchVideos, useRefresher, Video } from "../lib/youtubeapi";
import { VideoListItem } from "./video";

export function SearchVideoList() {
  const [searchText, setSearchText] = useState<string>();
  const { data, error, isLoading } = useRefresher<Video[] | undefined>(async () => {
    if (searchText) {
      return await searchVideos(searchText);
    }
    return undefined;
  }, [searchText]);
  if (error) {
    showToast(ToastStyle.Failure, "Could not search videos", getErrorMessage(error));
  }

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} throttle={true}>
      {data?.map((v) => (
        <VideoListItem key={v.id} video={v} />
      ))}
    </List>
  );
}
