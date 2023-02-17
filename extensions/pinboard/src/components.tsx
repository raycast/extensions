import { List, ActionPanel, Action, Color, Icon, confirmAlert, Alert } from "@raycast/api";
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

export function BookmarkListItem(props: { bookmark: Bookmark; onDelete: (bookmark: Bookmark) => Promise<void> }) {
  const { bookmark, onDelete } = props;

  const keywords: string[] = [];
  const tags: List.Item.Accessory[] = [];

  if (bookmark.tags?.length) {
    const bookmarks = bookmark.tags.split(" ");
    if (bookmarks.length) {
      bookmarks.forEach((bookmark) => {
        keywords.push(`#${bookmark}`);
        tags.push({ tag: { value: bookmark, color: Color.Orange } });
      });
    }
  }

  const title = bookmark.title.split(" ");
  if (title.length) {
    title.forEach((title) => {
      keywords.push(title);
    });
  }

  return (
    <List.Item
      id={bookmark.id}
      title={bookmark.title}
      icon="list-icon.png"
      accessories={tags}
      keywords={keywords}
      actions={<Actions bookmark={bookmark} onDelete={onDelete} />}
    />
  );

  function Actions({ bookmark, onDelete }: { bookmark: Bookmark; onDelete: (bookmark: Bookmark) => Promise<void> }) {
    return (
      <ActionPanel>
        <Action.OpenInBrowser url={bookmark.url} />
        <Action.CopyToClipboard title="Copy URL" content={bookmark.url} />
        <Action
          title="Delete bookmark"
          style={Action.Style.Destructive}
          icon={Icon.Trash}
          shortcut={{ modifiers: ["ctrl"], key: "x" }}
          onAction={async () => {
            const options: Alert.Options = {
              title: "Delete Bookmark",
              message: "Are you sure you want to delete the bookmark?",
              primaryAction: {
                title: "Delete Bookmark",
                style: Alert.ActionStyle.Destructive,
              },
            };
            if (await confirmAlert(options)) {
              await onDelete(bookmark);
            }
          }}
        />
      </ActionPanel>
    );
  }
}
