import { Grid } from "@raycast/api";

import { GifActions } from "./GifActions";

import { IGif } from "../models/gif";
import { getGridItemSize } from "../preferences";

interface GifGridItemProps {
  item: IGif;
  index: number;
  visitGifItem: (gif: IGif) => void;
  section: string;
  mutate: () => Promise<void>;
}

export function GifGridItem(props: GifGridItemProps) {
  const { preview_gif_url, title, gif_url } = props.item;

  const isLargeGridSize = getGridItemSize() === "large";

  return (
    <Grid.Item
      title={title}
      content={{ source: isLargeGridSize ? gif_url : preview_gif_url }}
      actions={
        <GifActions item={props.item} showViewDetails={true} visitGifItem={props.visitGifItem} mutate={props.mutate} />
      }
    />
  );
}
