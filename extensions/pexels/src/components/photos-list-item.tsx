import { Color, Icon, List } from "@raycast/api";
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
      keywords={[`${(item as PexelsPhoto).alt.trim()}`, item.avg_color + ""]}
      accessories={[
        {
          icon: { source: Icon.CircleFilled, tintColor: (item as PexelsPhoto).avg_color },
          tooltip: `${(item as PexelsPhoto).avg_color}`,
        },
      ]}
      detail={
        <List.Item.Detail
          isLoading={false}
          markdown={`<img src="${item.src.medium}" alt="${(item as PexelsPhoto).alt.trim()}" height="${190}" />`}
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
