import { Grid } from "@raycast/api";
import React from "react";
import { Photo } from "pexels";
import { ActionOnPhotos } from "./action-on-photos";

export function PhotosGridItem(props: { pexelsPhoto: Photo; index: number }) {
  const { pexelsPhoto, index } = props;

  return (
    <Grid.Item
      id={index + "_" + pexelsPhoto.id}
      key={index + "_" + pexelsPhoto.id}
      content={pexelsPhoto.src.medium}
      title={pexelsPhoto.photographer}
      actions={<ActionOnPhotos pexelsPhoto={pexelsPhoto} />}
    />
  );
}
