import { List } from "@raycast/api";
import React, { useState } from "react";
import { searchPhotos } from "./hooks/hooks";
import { PhotosListItem } from "./components/photos-list-item";
import { PexelsEmptyView } from "./components/pexels-empty-view";
import { isEmpty } from "./utils/common-utils";
import { SearchRequest } from "./utils/types";

export default function SearchPhotos() {
  const [searchContent, setSearchContent] = useState<string>("");
  const [searchRequest, setSearchRequest] = useState<SearchRequest>({ searchContent: searchContent, page: 1 });
  const { pexelsPhotos, loading } = searchPhotos(searchRequest);

  const emptyViewTitle = () => {
    if (loading) {
      return "Loading...";
    }
    if (pexelsPhotos?.photos.length === 0 && !isEmpty(searchContent)) {
      return "No Photos";
    }
    return "Welcome to Pexels";
  };

  return (
    <List
      isShowingDetail={pexelsPhotos?.photos.length !== 0}
      isLoading={loading}
      searchBarPlaceholder={"Search photos"}
      onSearchTextChange={(newValue) => {
        setSearchRequest({ searchContent: newValue, page: 1 });
        setSearchContent(newValue);
      }}
      onSelectionChange={(id) => {
        if (typeof id !== "undefined") {
          const _id = pexelsPhotos?.photos.length - 1 + "_" + pexelsPhotos?.photos[pexelsPhotos.photos.length - 1]?.id;
          if (id === _id) {
            setSearchRequest({ searchContent: searchContent, page: searchRequest.page + 1 });
          }
        }
      }}
      throttle={true}
    >
      <PexelsEmptyView title={emptyViewTitle()} />
      {pexelsPhotos?.photos.map((value, index) => (
        <PhotosListItem key={index} pexelsPhoto={value} index={index} />
      ))}
    </List>
  );
}
