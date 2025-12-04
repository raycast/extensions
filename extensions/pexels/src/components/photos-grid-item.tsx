import { Grid, Icon } from "@raycast/api";
import { Photo } from "pexels";
import { ActionOnPhotos } from "./action-on-photos";
import { PexelsPhoto } from "../types/types";

export function PhotosGridItem(props: { item: Photo; index: number }) {
  const { item, index } = props;

  return (
    <Grid.Item
      id={index + "_" + item.id}
      key={index + "_" + item.id}
      content={{ value: item.src.medium, tooltip: `${(item as PexelsPhoto).alt.trim()}` }}
      title={item.photographer}
      accessory={{
        icon: { source: Icon.CircleFilled, tintColor: (item as PexelsPhoto).avg_color },
        tooltip: `${(item as PexelsPhoto).avg_color}`,
      }}
      actions={<ActionOnPhotos item={item} />}
    />
  );
}
