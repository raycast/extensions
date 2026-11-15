import { Grid } from "@raycast/api";

import { GifActions } from "./GifActions";

import { IGif } from "../models/gif";
import { getServiceFromUrl } from "../lib/getServiceFromUrl";
import { getServiceIcon } from "../lib/serviceIcon";
import { getGridItemSize, getServiceTitle } from "../preferences";

interface GifGridItemProps {
  item: IGif;
  index: number;
  visitGifItem: (gif: IGif) => void;
  section: string;
  showSource?: boolean;
  mutate: () => Promise<void>;
}

export function GifGridItem(props: GifGridItemProps) {
  const { small_preview_gif_url, large_preview_gif_url, title, gif_url } = props.item;

  const isLargeGridSize = getGridItemSize() === "large";
  const source = props.showSource ? getServiceFromUrl(props.item) : undefined;

  return (
    <Grid.Item
      title={title}
      content={{ source: isLargeGridSize ? (large_preview_gif_url ?? gif_url) : small_preview_gif_url }}
      accessory={source ? { icon: getServiceIcon(source), tooltip: getServiceTitle(source) } : undefined}
      actions={
        <GifActions item={props.item} showViewDetails={true} visitGifItem={props.visitGifItem} mutate={props.mutate} />
      }
    />
  );
}
