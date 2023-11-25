import { getPreferenceValues, Grid, List } from "@raycast/api";
import React, { useState } from "react";
import { searchVideos } from "./hooks/hooks";
import { PexelsEmptyView } from "./components/pexels-empty-view";
import { isEmpty } from "./utils/common-utils";
import { SearchRequest } from "./types/types";
import { Preferences } from "./types/preferences";
import { VideosGridItem } from "./components/videos-grid-item";
import { VideosListItem } from "./components/video-list-item";

export default function SearchVideos() {
  const preferences = getPreferenceValues<Preferences>();
  const [searchContent, setSearchContent] = useState<string>("");
  const [searchRequest, setSearchRequest] = useState<SearchRequest>({ searchContent: searchContent, page: 1 });
  const { pexelsVideos, loading } = searchVideos(searchRequest);

  const emptyViewTitle = () => {
    if (loading) {
      return "Loading...";
    }
    if (pexelsVideos?.videos.length === 0 && !isEmpty(searchContent)) {
      return "No Photos";
    }
    return "Welcome to Pexels";
  };

  return preferences.layout === "List" ? (
    <List
      isShowingDetail={pexelsVideos?.videos.length !== 0}
      isLoading={loading}
      searchBarPlaceholder={"Search photos"}
      onSearchTextChange={(newValue) => {
        setSearchRequest({ searchContent: newValue, page: 1 });
        setSearchContent(newValue);
      }}
      onSelectionChange={(id) => {
        if (typeof id !== "undefined") {
          const _id = pexelsVideos?.videos.length - 1 + "_" + pexelsVideos?.videos[pexelsVideos.videos.length - 1]?.id;
          if (id === _id) {
            setSearchRequest({ searchContent: searchContent, page: searchRequest.page + 1 });
          }
        }
      }}
      throttle={true}
    >
      <PexelsEmptyView title={emptyViewTitle()} layout={preferences.layout} />
      {pexelsVideos?.videos.map((value, index) => (
        <VideosListItem key={index} item={value} index={index} />
      ))}
    </List>
  ) : (
    <Grid
      columns={parseInt(preferences.columns)}
      isLoading={loading}
      aspectRatio={"3/2"}
      fit={Grid.Fit.Fill}
      searchBarPlaceholder={"Search photos"}
      onSearchTextChange={(newValue) => {
        setSearchRequest({ searchContent: newValue, page: 1 });
        setSearchContent(newValue);
      }}
      onSelectionChange={(id) => {
        if (typeof id !== "undefined") {
          const _id = pexelsVideos?.videos.length - 1 + "_" + pexelsVideos?.videos[pexelsVideos.videos.length - 1]?.id;
          if (id === _id) {
            setSearchRequest({ searchContent: searchContent, page: searchRequest.page + 1 });
          }
        }
      }}
      throttle={true}
    >
      <PexelsEmptyView title={emptyViewTitle()} layout={preferences.layout} />
      {pexelsVideos?.videos.map((value, index) => (
        <VideosGridItem key={index} item={value} index={index} />
      ))}
    </Grid>
  );
}
