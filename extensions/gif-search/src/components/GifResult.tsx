import { useContext } from "react";

import { List, Icon, Color, Grid } from "@raycast/api";

import { GifDetailsActions } from "./GifDetailsActions";

import AppContext from "../components/AppContext";
import { IGif } from "../models/gif";
import { ServiceName, getGridItemSize } from "../preferences";

export function GifResult(props: { item: IGif; index: number; service?: ServiceName }) {
  const { preview_gif_url, title, id, gif_url } = props.item;
  const { state } = useContext(AppContext);
  const is_fav = state.favIds?.get(props.service as ServiceName)?.has(id.toString());

  const accessories: List.Item.Accessory[] = [];
  if (is_fav) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
  }

  const isLargeGridSize = getGridItemSize() === Grid.ItemSize.Large;

  return (
    <Grid.Item
      title={title}
      content={{ source: isLargeGridSize ? gif_url : preview_gif_url }}
      actions={<GifDetailsActions item={props.item} showViewDetails={true} service={props.service} />}
    />
  );
}
