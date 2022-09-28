import { List } from "@raycast/api";
import React, { Dispatch, SetStateAction } from "react";
import { Photos } from "pexels";
import { PexelsEmptyView } from "./pexels-empty-view";
import { PhotosListItem } from "./photos-list-item";

export function CuratedPhotosList(props: {
  pexelsPhotos: Photos;
  loading: boolean;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
}) {
  const { pexelsPhotos, loading, page, setPage } = props;

  return (
    <List
      isShowingDetail={pexelsPhotos?.photos?.length !== 0}
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
      <PexelsEmptyView title={"No Photos"} layout={"List"} />
      {pexelsPhotos?.photos.map((value, index) => (
        <PhotosListItem key={index} pexelsPhoto={value} index={index} />
      ))}
    </List>
  );
}
