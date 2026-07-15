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
  const { small_preview_gif_url, large_preview_gif_url, title, gif_url } = props.item;

  const isLargeGridSize = getGridItemSize() === "large";

  return (
    <Grid.Item
      title={title}
      content={{ source: isLargeGridSize ? (large_preview_gif_url ?? gif_url) : small_preview_gif_url }}
      actions={
        <GifActions item={props.item} showViewDetails={true} visitGifItem={props.visitGifItem} mutate={props.mutate} />
      }
    />
  );
}
