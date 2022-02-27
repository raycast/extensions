import {
  ActionPanel,
  ActionPanelItem,
  Color,
  CopyToClipboardAction,
  getPreferenceValues,
  Icon,
  List,
  OpenInBrowserAction,
} from "@raycast/api";
import { useBookmarks } from "./utils/hooks";

const preferences = getPreferenceValues();

export default function Search() {
  const { bookmarks, loading, toggleFavorite, refreshBookmarks, archiveBookmark, deleteBookmark } = useBookmarks();

  return (
    <List throttle isLoading={loading} searchBarPlaceholder="Filter bookmarks by title...">
      {bookmarks.map((bookmark) => (
        <List.Item
          key={bookmark.id}
          title={bookmark.title}
          icon={bookmark.type === "article" ? Icon.TextDocument : Icon.Video}
          subtitle={bookmark.author}
          accessoryTitle={bookmark.updatedAt.toDateString().replace(/^\w+\s/, "")}
          accessoryIcon={bookmark.favorite ? { source: Icon.Star, tintColor: Color.Yellow } : undefined}
          actions={
            <ActionPanel title={bookmark.title}>
              {preferences.defaultOpen === "pocket-website" ? (
                <ActionPanel.Section>
                  <OpenInBrowserAction title="Open in Pocket" icon="pocket-logo.png" url={bookmark.pocketUrl} />
                  <OpenInBrowserAction title="Open in Browser" url={bookmark.originalUrl} />
                </ActionPanel.Section>
              ) : (
                <ActionPanel.Section>
                  <OpenInBrowserAction title="Open in Browser" url={bookmark.originalUrl} />
                  <OpenInBrowserAction title="Open in Pocket" icon="pocket-logo.png" url={bookmark.pocketUrl} />
                </ActionPanel.Section>
              )}
              <ActionPanel.Section>
                <ActionPanelItem
                  title="Archive Bookmark"
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
                  icon={Icon.Checkmark}
                  onAction={() => archiveBookmark(bookmark.id)}
                />
                <ActionPanelItem
                  title={`${bookmark.favorite ? "Unmark" : "Mark"} as Favorite`}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                  icon={Icon.Star}
                  onAction={() => toggleFavorite(bookmark.id)}
                />
                <ActionPanelItem
                  title="Delete Bookmark"
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  onAction={() => deleteBookmark(bookmark.id)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <CopyToClipboardAction
                  title="Copy Bookmark Title"
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  content={bookmark.title}
                />
                <CopyToClipboardAction
                  title="Copy Bookmark URL"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  content={bookmark.originalUrl}
                />
                <CopyToClipboardAction
                  title="Copy Pocket Bookmark URL"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  content={bookmark.pocketUrl}
                />
                {bookmark.author ? (
                  <CopyToClipboardAction
                    title="Copy Bookmark Author"
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "," }}
                    content={bookmark.author}
                  />
                ) : null}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <ActionPanelItem
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => refreshBookmarks()}
                />
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
