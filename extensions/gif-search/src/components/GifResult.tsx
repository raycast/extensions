import { Action, ActionPanel, Icon, List } from "@raycast/api";

import { GifDetails } from "./GifDetails";
import type { IGif } from "../models/gif";
import { getShowPreview } from "../preferences";

export function GifResult(props: { item: IGif; index: number }) {
  const { preview_gif_url, title, url } = props.item;

  const showPreview = getShowPreview();

  return (
    <List.Item
      title={title}
      icon={{ source: preview_gif_url }}
      actions={
        <ActionPanel title={title}>
          {showPreview && (
            <Action.Push
              title="Preview GIF"
              icon={Icon.Eye}
              target={<GifDetails item={props.item} index={props.index} />}
            />
          )}
          <Action.OpenInBrowser url={url} />
          <Action.CopyToClipboard content={url} shortcut={{ modifiers: ["cmd", "shift"], key: "c" }} />
        </ActionPanel>
      }
    />
  );
}
