import { Action, ActionPanel, Detail, Keyboard } from "@raycast/api";
import { VolumeItem } from "../types/google-books.dt";
import { convertInfoToMarkdown } from "../utils/books";

export function BookDetail({ item }: { item: VolumeItem }) {
  return (
    <Detail
      navigationTitle={item.volumeInfo.title}
      markdown={convertInfoToMarkdown(item)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={item.volumeInfo.infoLink} />
          <Action.CopyToClipboard
            shortcut={Keyboard.Shortcut.Common.Copy}
            title="Copy URL to Clipboard"
            content={item.volumeInfo.infoLink}
          />
        </ActionPanel>
      }
    />
  );
}
