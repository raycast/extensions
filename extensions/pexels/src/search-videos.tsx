import { Grid, List } from "@raycast/api";
import { useMemo, useState } from "react";
import { PexelsEmptyView } from "./components/pexels-empty-view";
import { isEmpty } from "./utils/common-utils";
import { VideosGridItem } from "./components/videos-grid-item";
import { VideosListItem } from "./components/video-list-item";
import { columns, layout } from "./types/preferences";
import { useVideos } from "./hooks/useVideos";

export default function SearchVideos() {
  const [searchContent, setSearchContent] = useState<string>("");
  const { data: videosData, isLoading, pagination } = useVideos(searchContent);

  const videos = useMemo(() => {
    return videosData || [];
  }, [videosData]);

  const emptyViewTitle = () => {
    if (isLoading) {
      return "Loading...";
    }
    if (videos.length === 0 && !isEmpty(searchContent)) {
      return "No Photos";
    }
    return "Welcome to Pexels";
  };

  return layout === "List" ? (
    <List
      isShowingDetail={videos.length !== 0}
      isLoading={isLoading}
      pagination={pagination}
      searchBarPlaceholder={"Search videos"}
      onSearchTextChange={setSearchContent}
      throttle={true}
    >
      <PexelsEmptyView title={emptyViewTitle()} />
      {videos.map((value, index) => (
        <VideosListItem key={index} item={value} index={index} />
      ))}
    </List>
  ) : (
    <Grid
      columns={parseInt(columns)}
      isLoading={isLoading}
      pagination={pagination}
      aspectRatio={"3/2"}
      fit={Grid.Fit.Fill}
      searchBarPlaceholder={"Search videos"}
      onSearchTextChange={setSearchContent}
      throttle={true}
    >
      <PexelsEmptyView title={emptyViewTitle()} />
      {videos.map((value, index) => (
        <VideosGridItem key={index} item={value} index={index} />
      ))}
    </Grid>
  );
}
