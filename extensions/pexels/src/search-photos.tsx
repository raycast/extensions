import { List } from "@raycast/api";
import React, { useState } from "react";
import { searchPhotos } from "./hooks/hooks";
import { PhotosListItem } from "./components/photos-list-item";
import { PexelsEmptyView } from "./components/pexels-empty-view";
import { isEmpty } from "./utils/common-utils";

export default function SearchPhotos() {
  const [searchContent, setSearchContent] = useState<string>("");
  const [page, setPage] = useState<number>(1);
  const { pexelsPhotos, loading } = searchPhotos(searchContent.trim(), page);

  return (
    <List
      isShowingDetail={pexelsPhotos?.photos.length !== 0}
      isLoading={loading}
      searchBarPlaceholder={"Search photos"}
      onSearchTextChange={setSearchContent}
      onSelectionChange={(id) => {
        if (typeof id !== "undefined") {
          const _id = pexelsPhotos?.photos.length - 1 + "_" + pexelsPhotos?.photos[pexelsPhotos.photos.length - 1]?.id;
          if (id === _id) {
            setPage(page + 1);
          }
        }
      }}
      throttle={true}
    >
      <PexelsEmptyView title={isEmpty(searchContent) ? "Welcome to Pexels" : "No Photos"} />
      {pexelsPhotos?.photos.map((value, index) => (
        <PhotosListItem key={index} pexelsPhoto={value} index={index} />
      ))}
    </List>
  );
}
