import { List, Icon, Color } from "@raycast/api";

import { GifDetailsActions } from "./GifDetailsActions";
import { IGif, renderGifMarkdownDetails } from "../models/gif";
import { getShowPreview, ServiceName } from "../preferences";

export function GifResult(props: { item: IGif; index: number; service?: ServiceName }) {
  const { preview_gif_url, title, is_fav } = props.item;

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
      actions={<GifDetailsActions item={props.item} showViewDetails={true} />}
      accessories={accessories}
    />
  );
}
