import { List, ActionPanel, Action } from "@raycast/api";
import { Bookmark } from "./api";

export function BookmarkListItem(props: { bookmark: Bookmark }) {
  const bookmark = props.bookmark;

  return (
    <List.Item
      id={bookmark.id}
      title={bookmark.title}
      icon="list-icon.png"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={bookmark.url} />
          <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />
        </ActionPanel>
      }
      accessories={[
        {
          text: bookmark.tags,
        },
      ]}
    />
  );
}
