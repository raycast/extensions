import { showToast, Toast } from "@raycast/api";
import { useState } from "react";
import { getErrorMessage } from "../lib/utils";
import { searchVideos, useRefresher, Video } from "../lib/youtubeapi";
import { VideoItem } from "./video";
import { ListOrGrid, getViewLayout, getGridItemSize } from "./listgrid";
import { RecentVideos, PinVideo } from "./recent_videos";

export function SearchVideoList(props: { channedId?: string | undefined }) {
  const [searchText, setSearchText] = useState<string>("");
  const { data, error, isLoading } = useRefresher<Video[] | undefined>(async () => {
    if (searchText) {
      return await searchVideos(searchText, props.channedId);
    }
    return undefined;
  }, [searchText]);
  if (error) {
    showToast(Toast.Style.Failure, "Could not search videos", getErrorMessage(error));
  }
  if (data) {
    return (
      <ListOrGrid
        layout={getViewLayout()}
        itemSize={getGridItemSize()}
        isLoading={isLoading}
        onSearchTextChange={setSearchText}
        throttle={true}
      >
        {data?.map((v) => (
          <VideoItem key={v.id} video={v} actions={<PinVideo video={v} />}/>
        ))}
      </ListOrGrid>
    );
  } else {
    return <RecentVideos setRootSearchText={setSearchText} isLoading={isLoading} />;
  }
}
