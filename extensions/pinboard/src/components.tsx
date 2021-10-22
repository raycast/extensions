import { List, ActionPanel, OpenInBrowserAction, CopyToClipboardAction } from "@raycast/api";
import { Bookmark } from "./api";

export function BookmarkListItem(props: { bookmark: Bookmark }) {
  const bookmark = props.bookmark;

  return (
    <List.Item
      id={bookmark.id}
      title={bookmark.title}
      icon="list-icon.png"
      accessoryTitle={bookmark.tags}
      actions={
        <ActionPanel>
          <OpenInBrowserAction url={bookmark.url} />
          <CopyToClipboardAction title="Copy URL" content={bookmark.url} />
        </ActionPanel>
      }
    />
  );
}
