import { List, ActionPanel, Action, Color } from "@raycast/api";
import { Bookmark } from "./types";

export function EmptyView(props: { title?: string; description?: string; actions?: false | JSX.Element }) {
  const { actions, title, description } = props;

  return (
    <List.EmptyView
      title={title || "No Bookmarks Found"}
      description={description || "Add bookmarks to Pinboard and try again."}
      icon="no-view.png"
      actions={actions}
    />
  );
}

export function BookmarkListItem(props: { bookmark: Bookmark }) {
  const { bookmark } = props;

  const keywords: string[] = [];
  const tags: List.Item.Accessory[] = [];

  if (bookmark.tags?.length) {
    const bookmarks = bookmark.tags.split(" ");
    if (bookmarks) {
      bookmarks.forEach((bookmark) => {
        keywords.push(`#${bookmark}`);
        tags.push({ tag: { value: bookmark, color: Color.Orange } });
      });
    }
  }

  return (
    <List.Item
      id={bookmark.id}
      title={bookmark.title}
      icon="list-icon.png"
      accessories={tags}
      keywords={keywords}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={bookmark.url} />
          <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />
        </ActionPanel>
      }
    />
  );
}
