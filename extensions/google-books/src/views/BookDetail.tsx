import { Action, ActionPanel, Detail, Keyboard } from "@raycast/api";
import { VolumeItem } from "../types/google-books.dt";
import { convertInfoToMarkdown } from "../utils/books";

export function BookDetail({ item }: { item: VolumeItem }) {
  const link = item.volumeInfo?.infoLink ?? item.selfLink;

  return (
    <Detail
      navigationTitle={item.volumeInfo?.title ?? "Book Details"}
      markdown={convertInfoToMarkdown(item)}
      actions={
        <ActionPanel>
          {link && <Action.OpenInBrowser url={link} />}
          {link && (
            <Action.CopyToClipboard
              shortcut={Keyboard.Shortcut.Common.Copy}
              title="Copy URL to Clipboard"
              content={link}
            />
          )}
        </ActionPanel>
      }
    />
  );
}
