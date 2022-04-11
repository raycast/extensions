import { List } from "@raycast/api";

import { GifDetailsActions } from "./GifDetails";
import { IGif, renderGifMarkdownDetails } from "../models/gif";
import { getShowPreview } from "../preferences";

export function GifResult(props: { item: IGif; index: number }) {
  const { preview_gif_url, title } = props.item;

  const showPreview = getShowPreview();

  return (
    <List.Item
      title={title}
      icon={{ source: preview_gif_url }}
      detail={showPreview && <List.Item.Detail markdown={renderGifMarkdownDetails(props.item)} />}
      actions={<GifDetailsActions item={props.item} showViewDetails={true} />}
    />
  );
}
