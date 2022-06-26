import { showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getErrorMessage, getUuid } from "../lib/utils";
import { searchVideos, useRefresher, Video } from "../lib/youtubeapi";
import { RecentSearchesList, useRecentSearch } from "./search";
import { VideoItem } from "./video";
import { ListOrGrid, getViewLayout, getGridItemSize } from "./listgrid";

export function SearchVideoList(props: { channedId?: string | undefined }) {
  const [searchText, setSearchText] = useState<string>();
  const [uuid] = useState<string>(getUuid());
  const [throttle, setThrottle] = useState<number | null>(null);
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
  const throttleSearch = (search: string) => {
    if (search) {
      setSearchText(search)
      const time = new Date().getTime();
      setThrottle(time);
      if (throttle && time - throttle > 1000) {
        appendRecentSearches(search);
      }
    }
  }
  if (data) {
    return (
      <ListOrGrid
        layout={getViewLayout()}
        itemSize={getGridItemSize()}
        isLoading={isLoading}
        searchText={searchText}
        onSearchTextChange={throttleSearch}
        throttle={false}
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
        setRootSearchText={throttleSearch}
        clearAll={clearAllRecentSearches}
      />
    );
  }
}
