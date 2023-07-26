import { Color, Icon, List } from "@raycast/api";
import React from "react";
import { Photo } from "pexels";
import { PexelsPhoto } from "../types/types";
import { ActionOnPhotos } from "./action-on-photos";

export function PhotosListItem(props: { item: Photo; index: number }) {
  const { item, index } = props;

  return (
    <List.Item
      id={index + "_" + item.id}
      key={index + "_" + item.id}
      icon={{ source: item.src.tiny }}
      title={item.photographer}
      accessories={[
        {
          icon: { source: Icon.CircleFilled, tintColor: (item as PexelsPhoto).avg_color },
          tooltip: `${(item as PexelsPhoto).avg_color}`,
        },
      ]}
      detail={
        <List.Item.Detail
          isLoading={false}
          markdown={`![${(item as PexelsPhoto).alt.trim()}](${item.src.medium})`}
          metadata={
            <List.Item.Detail.Metadata>
              {(item as PexelsPhoto).alt.trim() && (
                <List.Item.Detail.Metadata.Label title="Title" text={`${(item as PexelsPhoto).alt.trim()}`} />
              )}
              <List.Item.Detail.Metadata.Link
                title="User"
                target={`${item.photographer_url}`}
                text={`${item.photographer}`}
              />
              <List.Item.Detail.Metadata.Label title="Size" text={`${item.width}x${item.height}`} />
              <List.Item.Detail.Metadata.Label
                title="AvgColor"
                icon={{ source: Icon.CircleFilled, tintColor: `${item.avg_color}` as Color }}
                text={`${item.avg_color}`}
              />
              <List.Item.Detail.Metadata.Link title="URL" target={`${item.url}`} text={`${item.url}`} />
            </List.Item.Detail.Metadata>
          }
        />
      }
      actions={<ActionOnPhotos item={item} />}
    />
  );
}
