import { Grid } from "@raycast/api";
import React, { Dispatch, SetStateAction } from "react";
import { Photos } from "pexels";
import { PexelsEmptyView } from "./pexels-empty-view";
import { PhotosGridItem } from "./photos-grid-item";
import { Preferences } from "../types/preferences";

export function CuratedPhotosGrid(props: {
  preferences: Preferences;
  pexelsPhotos: Photos;
  loading: boolean;
  page: number;
  setPage: Dispatch<SetStateAction<number>>;
}) {
  const { preferences, pexelsPhotos, loading, page, setPage } = props;

  return (
    <Grid
      isLoading={loading}
      itemSize={preferences.itemSize as Grid.ItemSize}
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
      <PexelsEmptyView title={"No Photos"} layout={preferences.layout} />
      {pexelsPhotos?.photos.map((value, index) => (
        <PhotosGridItem key={index} pexelsPhoto={value} index={index} />
      ))}
    </Grid>
  );
}
