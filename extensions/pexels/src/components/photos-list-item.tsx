import { List } from "@raycast/api";
import React from "react";
import { Photo } from "pexels";
import { PexelsPhoto } from "../types/types";
import { ActionOnPhotos } from "./action-on-photos";

export function PhotosListItem(props: { pexelsPhoto: Photo; index: number }) {
  const { pexelsPhoto, index } = props;

  return (
    <List.Item
      id={index + "_" + pexelsPhoto.id}
      key={index + "_" + pexelsPhoto.id}
      icon={{ source: pexelsPhoto.src.tiny }}
      title={pexelsPhoto.photographer}
      accessories={[
        {
          icon: { source: "solid-circle.png", tintColor: (pexelsPhoto as PexelsPhoto).avg_color },
          tooltip: `${(pexelsPhoto as PexelsPhoto).avg_color}`,
        },
      ]}
      detail={
        <List.Item.Detail
          isLoading={false}
          markdown={`<img src="${pexelsPhoto.src.medium}" alt="${pexelsPhoto.photographer}" height="256" />\n

**${(pexelsPhoto as PexelsPhoto).alt.trim()}**`}
        />
      }
      actions={<ActionOnPhotos pexelsPhoto={pexelsPhoto} />}
    />
  );
}
