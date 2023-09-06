import { Grid } from "@raycast/api";
import React from "react";
import { Photo } from "pexels";
import { ActionOnPhotos } from "./action-on-photos";

export function PhotosGridItem(props: { item: Photo; index: number }) {
  const { item, index } = props;

  return (
    <Grid.Item
      id={index + "_" + item.id}
      key={index + "_" + item.id}
      content={item.src.medium}
      title={item.photographer}
      actions={<ActionOnPhotos item={item} />}
    />
  );
}
