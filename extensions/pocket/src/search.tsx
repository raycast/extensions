import { Action, ActionPanel, Alert, Color, confirmAlert, getPreferenceValues, Icon, List } from "@raycast/api";
import { useBookmarks, useTags } from "./utils/hooks";
import { useState } from "react";
import { ReadState } from "./utils/types";
import { capitalize } from "lodash";
import ActionStyle = Alert.ActionStyle;

const preferences = getPreferenceValues();

interface SearchArguments {
  title: string;
}

export default function Search(props: { arguments: SearchArguments }) {
  const [readState, setReadState] = useState(preferences.defaultFilter);
  const [tag, setTag] = useState<string>();
  const [search, setSearch] = useState(props.arguments.title);
  const tags = useTags();
  const {
    bookmarks,
    addTag,
    removeTag,
    loading,
    toggleFavorite,
    refreshBookmarks,
    reAddBookmark,
    archiveBookmark,
    deleteBookmark,
  } = useBookmarks({
    search,
    tag,
    state: readState,
  });

  return (
    <List
      throttle
      searchText={search}
      onSearchTextChange={setSearch}
      isLoading={loading}
      searchBarPlaceholder="Filter bookmarks by title..."
      searchBarAccessory={
        <List.Dropdown
          storeValue
          defaultValue={readState}
          tooltip="Filter Bookmarks"
          onChange={(filter) => {
            if (tags.includes(filter)) {
              setReadState(ReadState.All);
              setTag(filter);
            } else {
              setReadState(filter as ReadState);
              setTag(undefined);
            }
          }}
        >
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item icon={Icon.Tray} title="All" value={ReadState.All} />
            <List.Dropdown.Item icon={Icon.PlusCircle} title="Unread" value={ReadState.Unread} />
            <List.Dropdown.Item icon={Icon.CheckCircle} title="Archived" value={ReadState.Archive} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Tags">
            {tags.map((tag) => (
              <List.Dropdown.Item key={tag} icon={Icon.Tag} title={capitalize(tag)} value={tag} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {bookmarks.map((bookmark) => (
        <List.Item
          key={bookmark.id}
          title={bookmark.title || bookmark.originalUrl}
          icon={bookmark.type === "article" ? Icon.BlankDocument : bookmark.type === "image" ? Icon.Image : Icon.Video}
          subtitle={bookmark.author}
          accessories={[
            { icon: bookmark.favorite ? { source: Icon.Star, tintColor: Color.Yellow } : undefined },
            { icon: bookmark.archived ? { source: Icon.Checkmark, tintColor: Color.Green } : undefined },
            { text: new Date(bookmark.updatedAt)?.toDateString().replace(/^\w+\s/, "") },
          ]}
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
                {bookmark.archived ? (
                  <Action
                    title="Re-add Bookmark"
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    icon={Icon.PlusCircle}
                    onAction={() => reAddBookmark(bookmark.id)}
                  />
                ) : (
                  <Action
                    title="Archive Bookmark"
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    icon={Icon.Checkmark}
                    onAction={() => archiveBookmark(bookmark.id)}
                  />
                )}
                <Action
                  title={`${bookmark.favorite ? "Unmark" : "Mark"} as Favorite`}
                  shortcut={{ modifiers: ["cmd"], key: "f" }}
                  icon={Icon.Star}
                  onAction={() => toggleFavorite(bookmark.id)}
                />
                <Action
                  title="Delete Bookmark"
                  shortcut={{ modifiers: ["ctrl"], key: "x" }}
                  style={Action.Style.Destructive}
                  icon={{ source: Icon.Trash, tintColor: Color.Red }}
                  onAction={() => {
                    return confirmAlert({
                      title: "Do you want to delete it?",
                      message: bookmark.title,
                      icon: {
                        source: Icon.Trash,
                        tintColor: Color.Red,
                      },
                      primaryAction: {
                        title: "Delete",
                        style: ActionStyle.Destructive,
                        onAction: () => deleteBookmark(bookmark.id),
                      },
                    });
                  }}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action.CopyToClipboard
                  title="Copy Title"
                  shortcut={{ modifiers: ["cmd"], key: "." }}
                  content={bookmark.title}
                />
                <Action.CopyToClipboard
                  title="Copy URL"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
                  content={bookmark.originalUrl}
                />
                <Action.CopyToClipboard
                  title="Copy Pocket URL"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  content={bookmark.pocketUrl}
                />
                {bookmark.author ? (
                  <Action.CopyToClipboard
                    title="Copy Author"
                    shortcut={{ modifiers: ["ctrl", "shift"], key: "," }}
                    content={bookmark.author}
                  />
                ) : null}
                <Action.CopyToClipboard
                  title="Copy URL as Markdown"
                  shortcut={{ modifiers: ["cmd", "shift"], key: "m" }}
                  content={`[${bookmark.title}](${bookmark.originalUrl})`}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={() => refreshBookmarks()}
                />
              </ActionPanel.Section>
              <ActionPanel.Section>
                <ActionPanel.Submenu icon={Icon.Tag} title="Add Tag">
                  {tags
                    .filter((tag) => !bookmark.tags.includes(tag))
                    .map((tag) => (
                      <Action
                        key={tag}
                        title={capitalize(tag)}
                        icon={Icon.Tag}
                        onAction={() => addTag(bookmark.id, tag)}
                      />
                    ))}
                </ActionPanel.Submenu>
                <ActionPanel.Submenu icon={Icon.Tag} title="Remove Tag">
                  {bookmark.tags.map((tag) => (
                    <Action
                      key={tag}
                      title={capitalize(tag)}
                      icon={Icon.Tag}
                      onAction={() => removeTag(bookmark.id, tag)}
                    />
                  ))}
                </ActionPanel.Submenu>
              </ActionPanel.Section>
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
