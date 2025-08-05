import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  Image,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { getFavicon } from "@raycast/utils";
import { useState } from "react";
import { ContentType, ReadState } from "./lib/api";
import { View } from "./lib/oauth/view";
import { preferences } from "./lib/preferences";
import { useBookmarks } from "./lib/hooks/use-bookmarks";
import { useTags } from "./lib/hooks/use-tags";
import { showExportAlert, titleCase } from "./lib/utils";

interface SearchArguments {
  title: string;
}

function SearchBookmarks(props: { arguments?: SearchArguments }) {
  const [state, setState] = useState<ReadState>(ReadState.All);
  const [tag, setTag] = useState<string>();
  const [contentType, setContentType] = useState<ContentType>();
  const [search, setSearch] = useState<string>(props.arguments?.title || "");
  const [tagSearch, setTagSearch] = useState<string>();

  const { tags } = useTags();

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
    contentType,
    state,
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
          defaultValue={state}
          tooltip="Filter Bookmarks"
          onChange={(filter) => {
            if (tags.includes(filter)) {
              setState(ReadState.All);
              setContentType(undefined);
              setTag(filter);
            } else if (Object.values(ContentType).includes(filter as ContentType)) {
              setState(ReadState.All);
              setContentType(filter as ContentType);
              setTag(undefined);
            } else {
              setState(filter as ReadState);
              setContentType(undefined);
              setTag(undefined);
            }
          }}
        >
          <List.Dropdown.Section title="Status">
            <List.Dropdown.Item icon={Icon.Tray} title="All" value={ReadState.All} />
            <List.Dropdown.Item icon={Icon.PlusCircle} title="Unread" value={ReadState.Unread} />
            <List.Dropdown.Item icon={Icon.CheckCircle} title="Archived" value={ReadState.Archive} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Content Type">
            <List.Dropdown.Item icon={Icon.Video} title="Video" value={ContentType.Video} />
            <List.Dropdown.Item icon={Icon.Document} title="Article" value={ContentType.Article} />
            <List.Dropdown.Item icon={Icon.Image} title="Image" value={ContentType.Image} />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Tags">
            {tags.map((tag) => (
              <List.Dropdown.Item key={tag} icon={Icon.Tag} title={titleCase(tag)} value={tag} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!loading && !bookmarks.length ? (
        <List.EmptyView
          icon="myList.svg"
          title="Start saving to your Pocket"
          actions={
            <ActionPanel>
              <Action
                icon={Icon.Plus}
                title="Create Bookmark"
                onAction={() => launchCommand({ type: LaunchType.UserInitiated, name: "create" })}
              />
            </ActionPanel>
          }
        />
      ) : (
        bookmarks.map((bookmark) => (
          <List.Item
            key={bookmark.id}
            title={bookmark.title || bookmark.originalUrl || ""}
            icon={getFavicon(bookmark.originalUrl, { mask: Image.Mask.RoundedRectangle })}
            subtitle={bookmark.author}
            accessories={[
              { icon: bookmark.favorite ? { source: Icon.Star, tintColor: Color.Yellow } : undefined },
              { icon: bookmark.archived ? { source: Icon.Checkmark, tintColor: Color.Green } : undefined },
              bookmark.tags.length > 0
                ? {
                    icon: Icon.Tag,
                    text: bookmark.tags.length.toString(),
                    tooltip: bookmark.tags.map(titleCase).join(", "),
                  }
                : {},
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
                      title="Re-Add Bookmark"
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
                        icon: { source: Icon.Trash, tintColor: Color.Red },
                        title: "Delete Bookmark",
                        message: bookmark.title || bookmark.originalUrl,
                        primaryAction: {
                          title: "Confirm",
                          style: Alert.ActionStyle.Destructive,
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
                  <ActionPanel.Submenu
                    icon={Icon.Tag}
                    title="Add Tag"
                    onOpen={() => setTagSearch("")}
                    onSearchTextChange={setTagSearch}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  >
                    {tags
                      .filter((tag) => !bookmark.tags.includes(tag))
                      .map((tag) => (
                        <Action
                          key={tag}
                          title={titleCase(tag)}
                          icon={Icon.Tag}
                          onAction={() => {
                            addTag(bookmark.id, tag);
                            setTagSearch(""); // To avoid flickering
                          }}
                        />
                      ))}
                    {tagSearch && (
                      <Action
                        icon={Icon.Plus}
                        title={tagSearch}
                        onAction={() => {
                          addTag(bookmark.id, tagSearch);
                          setTagSearch(""); // To avoid flickering
                        }}
                      />
                    )}
                  </ActionPanel.Submenu>
                  <ActionPanel.Submenu
                    icon={Icon.Tag}
                    title="Remove Tag"
                    shortcut={{ modifiers: ["cmd", "shift"], key: "t" }}
                  >
                    {bookmark.tags.map((tag) => (
                      <Action
                        key={tag}
                        title={titleCase(tag)}
                        icon={Icon.Tag}
                        onAction={() => removeTag(bookmark.id, tag)}
                      />
                    ))}
                  </ActionPanel.Submenu>
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
        ))
      )}
    </List>
  );
}

export default function Command() {
  showExportAlert();
  return (
    <View>
      <SearchBookmarks />
    </View>
  );
}
