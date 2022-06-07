import { useContext } from "react";

import { List, Icon, Color, Grid } from "@raycast/api";
import FileSizeFormat from "@saekitominaga/file-size-format";

import { GifDetailsActions } from "./GifDetailsActions";

import AppContext from "../components/AppContext";
import { IGif, renderGifMarkdownDetails } from "../models/gif";
import { getShowPreview, getServiceTitle, ServiceName, LayoutType, LAYOUT_TYPE } from "../preferences";

export function GifResult(props: { item: IGif; index: number; service?: ServiceName; layoutType?: LayoutType }) {
  const { preview_gif_url, title, id } = props.item;
  const { state } = useContext(AppContext);
  const is_fav = state.favIds?.get(props.service as ServiceName)?.has(id.toString());

  const showPreview = getShowPreview();
  const accessories: List.Item.Accessory[] = [];
  if (is_fav) {
    accessories.push({ icon: { source: Icon.Star, tintColor: Color.Yellow } });
  }

  const { metadata, attribution } = props.item;

  return props.layoutType === LAYOUT_TYPE.Grid ? (
    <Grid.Item
      title={title}
      content={{ source: preview_gif_url }}
      actions={<GifDetailsActions item={props.item} showViewDetails={true} service={props.service} />}
    />
  ) : (
    <List.Item
      title={title}
      icon={{ source: preview_gif_url }}
      detail={
        showPreview && (
          <List.Item.Detail
            markdown={renderGifMarkdownDetails(props.item, true)}
            metadata={
              metadata && (
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Title" text={title} />
                  {metadata?.width ? (
                    <List.Item.Detail.Metadata.Label title="Width" text={`${metadata.width.toString()}px`} />
                  ) : undefined}
                  {metadata?.height ? (
                    <List.Item.Detail.Metadata.Label title="Height" text={`${metadata.height.toString()}px`} />
                  ) : undefined}
                  {metadata?.size && (
                    <List.Item.Detail.Metadata.Label title="Size" text={FileSizeFormat.si(metadata?.size)} />
                  )}
                  <List.Item.Detail.Metadata.Label
                    title="Source"
                    text={getServiceTitle(props.service)}
                    icon={attribution}
                  />
                </List.Item.Detail.Metadata>
              )
            }
          />
        )
      }
      actions={<GifDetailsActions item={props.item} showViewDetails={true} service={props.service} />}
      accessories={accessories}
    />
  );
}
