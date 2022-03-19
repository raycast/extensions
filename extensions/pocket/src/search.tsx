import { Action, ActionPanel, Color, getPreferenceValues, Icon, List } from "@raycast/api";
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
                  <Action.OpenInBrowser title="Open in Pocket" icon="pocket-logo.png" url={bookmark.pocketUrl} />
                  <Action.OpenInBrowser title="Open in Browser" url={bookmark.originalUrl} />
                </ActionPanel.Section>
              ) : (
                <ActionPanel.Section>
                  <Action.OpenInBrowser title="Open in Browser" url={bookmark.originalUrl} />
                  <Action.OpenInBrowser title="Open in Pocket" icon="pocket-logo.png" url={bookmark.pocketUrl} />
                </ActionPanel.Section>
              )}
              <ActionPanel.Section>
                <Action
                  title="Archive Bookmark"
                  shortcut={{ modifiers: ["cmd"], key: "a" }}
                  icon={Icon.Checkmark}
                  onAction={() => archiveBookmark(bookmark.id)}
                />
                <Action
                  title={`${bookmark.favorite ? "Unmark" : "Mark"} as Favorite`}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                  icon={Icon.Star}
                  onAction={() => toggleFavorite(bookmark.id)}
                />
                <Action
                  title="Delete Bookmark"
                  shortcut={{ modifiers: ["cmd"], key: "d" }}
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  onAction={() => deleteBookmark(bookmark.id)}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Bookmark Title"
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  content={bookmark.title}
                />
                <Action.CopyToClipboard
                  title="Copy Bookmark URL"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  content={bookmark.originalUrl}
                />
                <Action.CopyToClipboard
                  title="Copy Pocket Bookmark URL"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  content={bookmark.pocketUrl}
                />
                {bookmark.author ? (
                  <Action.CopyToClipboard
                    title="Copy Bookmark Author"
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "," }}
                    content={bookmark.author}
                  />
                ) : null}
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
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
