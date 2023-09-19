import { useContext } from "react";

import { List, Icon, Color, Grid } from "@raycast/api";

import { GifActions } from "./GifActions";

import AppContext from "./AppContext";
import { IGif } from "../models/gif";
import { ServiceName, getGridItemSize } from "../preferences";

interface GifGridItemProps {
  item: IGif;
  index: number;
  visitGifItem: (gif: IGif) => void;
  service?: ServiceName;
  loadMoreGifs: () => void;
}

export function GifGridItem(props: GifGridItemProps) {
  const { preview_gif_url, title, id, gif_url } = props.item;
  const { state } = useContext(AppContext);
  const is_fav = state.favIds?.get(props.service as ServiceName)?.has(id.toString());

  const accessories: List.Item.Accessory[] = [];
  if (is_fav) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
  }

  const isLargeGridSize = getGridItemSize() === "large";

  return (
    <Grid.Item
      title={title}
      content={{ source: isLargeGridSize ? gif_url : preview_gif_url }}
      actions={
        <GifActions
          item={props.item}
          showViewDetails={true}
          service={props.service}
          visitGifItem={props.visitGifItem}
          loadMoreGifs={props.loadMoreGifs}
        />
      }
    />
  );
}
