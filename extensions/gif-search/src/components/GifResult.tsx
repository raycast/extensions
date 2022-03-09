import {Action, ActionPanel, List} from "@raycast/api";

import {IGif, renderGifMarkdownDetails} from "../models/gif";
import {getShowPreview} from "../preferences";

export function GifResult(props: {item: IGif; index: number}) {
  const {preview_gif_url, title, url, gif_url} = props.item;

  const showPreview = getShowPreview();

  return (
    <List.Item
      title={title}
      icon={{source: preview_gif_url}}
      detail={showPreview && <List.Item.Detail markdown={renderGifMarkdownDetails(props.item)} />}
      actions={
        <ActionPanel title={title}>
          <Action.OpenInBrowser url={url} />
          <Action.CopyToClipboard
            title="Copy GIF URL to Clipboard"
            content={stripQParams(gif_url)}
          />
          <Action.CopyToClipboard
            title="Copy Page URL to Clipboard"
            content={url}
            shortcut={{modifiers: ["cmd", "shift"], key: "c"}}
          />
        </ActionPanel>
      }
    />
  );
}

function stripQParams(url: string) {
  const earl = new URL(url);
  earl.search = "";
  return earl.toString();
}
