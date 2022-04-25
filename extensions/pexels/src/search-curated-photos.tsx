import { List } from "@raycast/api";
import React, { useState } from "react";
import { getCuratedPhotos } from "./hooks/hooks";
import { PhotosListItem } from "./utils/ui-component";

export default function SearchCuratedPhotos() {
  const [page, setPage] = useState<number>(1);
  const { pexelsPhotos, loading } = getCuratedPhotos(page);

  return (
    <List
      isShowingDetail={true}
      isLoading={loading}
      searchBarPlaceholder={"Search photographers"}
      onSelectionChange={(id) => {
        if (typeof id !== "undefined") {
          const _id = pexelsPhotos?.photos.length - 1 + "_" + pexelsPhotos?.photos[pexelsPhotos.photos.length - 1]?.id;
          if (id === _id) {
            setPage(page + 1);
          }
        }
      }}
    >
      {pexelsPhotos?.photos.map((value, index) => (
        <PhotosListItem key={index} pexelsPhoto={value} index={index} />
      ))}
    </List>
  );
}
