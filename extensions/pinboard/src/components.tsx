import { List, ActionPanel, Action, Color } from "@raycast/api";
import { Bookmark } from "./api";

export function BookmarkListItem(props: { bookmark: Bookmark }) {
  const bookmark = props.bookmark;

  return (
    <List.Item
      id={bookmark.id}
      title={bookmark.title}
      icon="list-icon.png"
      accessories={[{ text: { value: bookmark.tags, color: Color.Orange } }]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={bookmark.url} />
          <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />
        </ActionPanel>
      }
    />
  );
}
