import { useContext } from "react";

import { List, Icon, Color } from "@raycast/api";

import { GifDetailsActions } from "./GifDetailsActions";

import AppContext from "../components/AppContext";
import { IGif, renderGifMarkdownDetails } from "../models/gif";
import { getShowPreview, ServiceName } from "../preferences";

export function GifResult(props: { item: IGif; index: number; service?: ServiceName }) {
  const { preview_gif_url, title, id } = props.item;
  const { state } = useContext(AppContext);
  const is_fav = state.favIds?.get(props.service as ServiceName)?.has(id.toString());

  const showPreview = getShowPreview();
  const accessories: List.Item.Accessory[] = [];
  if (is_fav) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
  }

  return (
    <List.Item
      title={title}
      icon={{ source: preview_gif_url }}
      detail={showPreview && <List.Item.Detail markdown={renderGifMarkdownDetails(props.item)} />}
      actions={<GifDetailsActions item={props.item} showViewDetails={true} service={props.service} />}
      accessories={accessories}
    />
  );
}
