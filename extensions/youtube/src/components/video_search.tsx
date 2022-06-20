import { Grid, List, showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getErrorMessage, getUuid } from "../lib/utils";
import { searchVideos, useRefresher, Video } from "../lib/youtubeapi";
import { RecentSearchesList, useRecentSearch } from "./search";
import { VideoItem } from "./video";
import { getViewLayout, ListOrGrid } from "./listgrid";

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
    showToast(Toast.Style.Failure, "Could not search videos", getErrorMessage(error));
  }
  const layout = getViewLayout();
  if (searchText) {
    return (
      <ListOrGrid
        layout={layout}
        isLoading={isLoading}
        searchText={searchText}
        onSearchTextChange={(search: string) => {
          if (layout === "list" || search) appendRecentSearches(search);
        }}
        throttle={true}
      >
        {data?.map((v) => (
          <VideoItem key={v.id} video={v} />
        ))}
      </ListOrGrid>
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
