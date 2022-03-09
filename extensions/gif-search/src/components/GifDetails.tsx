import { Action, ActionPanel, Detail } from "@raycast/api";

import { useGifDecoder } from "../hooks/useGifDecoder";
import { useGifFrames } from "../hooks/useGifFrames";
import type { IGif } from "../models/gif";

export function GifDetails(props: { item: IGif; index: number }) {
  const { gif_url, slug, title, url } = props.item;

  const { frames = [], isDecoded } = useGifDecoder(gif_url, slug);
  const { currentFrame } = useGifFrames(0, frames, 60);

  const md = `<img src="${currentFrame}">`;

  return (
    <Detail
      isLoading={!isDecoded}
      navigationTitle={title}
      markdown={md}
      actions={
        <ActionPanel title={slug}>
          <Action.CopyToClipboard
            title="Copy GIF URL to Clipboard"
            content={gif_url}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Page URL to Clipboard"
            content={url}
            shortcut={{ modifiers: ["opt", "shift"], key: "c" }}
          />
          <Action.OpenInBrowser url={url} />
        </ActionPanel>
      }
    />
  );
}
