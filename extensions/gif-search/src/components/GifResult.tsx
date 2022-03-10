import { Action, ActionPanel, List } from "@raycast/api";

import { IGif, renderGifMarkdownDetails } from "../models/gif";
import { getShowPreview, getDefaultAction } from "../preferences";

export function GifResult(props: { item: IGif; index: number }) {
  const { preview_gif_url, title, url, gif_url } = props.item;

  const showPreview = getShowPreview();

  const openInBrowser = url ? <Action.OpenInBrowser key="openInBrowser" url={url} /> : undefined;
  const copyGif = (
    <Action.CopyToClipboard key="copyGifUrl" title="Copy GIF URL to Clipboard" content={stripQParams(gif_url)} />
  );
  const copyUrl = url ? (
    <Action.CopyToClipboard
      key="copyPageUrl"
      title="Copy Page URL to Clipboard"
      content={url}
      shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
    />
  ) : undefined;

  const actions = [openInBrowser, copyGif, copyUrl];
  const defaultAction = getDefaultAction();
  for (let index = 0; index < actions.length; index++) {
    const action = actions[index];

    if (action?.key == defaultAction) {
      // Move matching action to the front of the array to make it the default
      actions.splice(index, 1);
      actions.unshift(action);
    }
  }

  return (
    <List.Item
      title={title}
      icon={{ source: preview_gif_url }}
      detail={showPreview && <List.Item.Detail markdown={renderGifMarkdownDetails(props.item)} />}
      actions={<ActionPanel title={title}>{actions}</ActionPanel>}
    />
  );
}

function stripQParams(url: string) {
  const earl = new URL(url);
  earl.search = "";
  return earl.toString();
}
