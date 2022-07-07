import { List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getErrorMessage, getUuid } from "../lib/utils";
import { searchVideos, useRefresher, Video } from "../lib/youtubeapi";
import { RecentSearchesList, useRecentSearch } from "./search";
import { VideoListItem } from "./video";

export function SearchVideoList(props: { channedId?: string | undefined }) {
  const [searchText, setSearchText] = useState<string>();
  const [uuid] = useState<string>(getUuid());
  const {
    data: rc,
    appendRecentSearches,
    clearAllRecentSearches,
  } = useRecentSearch("recent_video_searches", uuid, setSearchText);
  const { data, error, isLoading } = useRefresher<Video[] | undefined>(async () => {
    if (searchText) {
      return await searchVideos(searchText, props.channedId);
    }
    return undefined;
  }, [searchText]);
  if (error) {
    showToast({
      style: Toast.Style.Failure,
      title: "Could not search videos",
      message: getErrorMessage(error),
    });
  }
  if (data) {
    return (
      <List isLoading={isLoading} onSearchTextChange={appendRecentSearches} throttle={true}>
        {data?.map((v) => (
          <VideoListItem key={v.id} video={v} />
        ))}
      </List>
    );
  } else {
    const isLoadingTotal = !searchText ? rc === undefined : true;
    return (
      <RecentSearchesList
        recentSearches={rc}
        isLoading={isLoadingTotal}
        setRootSearchText={appendRecentSearches}
        clearAll={clearAllRecentSearches}
      />
    );
  }
}
