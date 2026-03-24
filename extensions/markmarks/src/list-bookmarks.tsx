import {
  Action,
  ActionPanel,
  Alert,
  confirmAlert,
  Form,
  getPreferenceValues,
  Icon,
  List,
  showInFinder,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { getFavicon } from "@raycast/utils";
import { parseBookmarks, getAllBookmarks, getGroupNames } from "./lib/bookmarks-parser";
import { readBookmarksFile, deleteBookmark, editBookmark, moveBookmark } from "./lib/bookmarks-writer";
import { Bookmark } from "./lib/types";

interface BookmarkWithGroup extends Bookmark {
  groupName: string;
  groupPath: string;
}

export default function ListBookmarks() {
  const { bookmarksFile } = getPreferenceValues<Preferences>();
  const [bookmarks, setBookmarks] = useState<BookmarkWithGroup[]>([]);
  const [groups, setGroups] = useState<Array<{ name: string; path: string; level: number }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  const loadBookmarks = () => {
    try {
      const content = readBookmarksFile(bookmarksFile);
      const parsed = parseBookmarks(content);
      const allBookmarks = getAllBookmarks(parsed.groups, parsed.rootBookmarks);
      const allGroups = getGroupNames(parsed.groups);
      setBookmarks(allBookmarks);
      setGroups(allGroups);
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load bookmarks",
        message: String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, [bookmarksFile]);

  const handleDelete = async (bookmark: BookmarkWithGroup) => {
    const confirmed = await confirmAlert({
      title: "Delete Bookmark",
      message: `Are you sure you want to delete "${bookmark.title}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        deleteBookmark(bookmarksFile, bookmark.line);
        showToast({ style: Toast.Style.Success, title: "Bookmark deleted" });
        loadBookmarks();
      } catch (error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete bookmark",
          message: String(error),
        });
      }
    }
  };

  const handleMove = (bookmark: BookmarkWithGroup, targetGroup: string) => {
    try {
      moveBookmark(bookmarksFile, bookmark, targetGroup);
      showToast({ style: Toast.Style.Success, title: targetGroup ? `Moved to ${targetGroup}` : "Moved to root" });
      loadBookmarks();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to move bookmark",
        message: String(error),
      });
    }
  };

  // Group bookmarks by their group path for display
  const groupedBookmarks = bookmarks.reduce(
    (acc, bookmark) => {
      const key = bookmark.groupPath;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(bookmark);
      return acc;
    },
    {} as Record<string, BookmarkWithGroup[]>,
  );

  // Filter bookmarks based on search
  const filteredGroups = Object.entries(groupedBookmarks).filter(([, groupBookmarks]) => {
    if (!searchText) return true;
    const lowerSearch = searchText.toLowerCase();
    return groupBookmarks.some(
      (b) =>
        b.title.toLowerCase().includes(lowerSearch) ||
        b.url.toLowerCase().includes(lowerSearch) ||
        b.description?.toLowerCase().includes(lowerSearch),
    );
  });

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search bookmarks..."
    >
      {filteredGroups.map(([groupPath, groupBookmarks]) => {
        const filteredBookmarks = searchText
          ? groupBookmarks.filter(
              (b) =>
                b.title.toLowerCase().includes(searchText.toLowerCase()) ||
                b.url.toLowerCase().includes(searchText.toLowerCase()) ||
                b.description?.toLowerCase().includes(searchText.toLowerCase()),
            )
          : groupBookmarks;

        if (filteredBookmarks.length === 0) return null;

        const bookmarkItems = filteredBookmarks.map((bookmark) => (
          <List.Item
            key={`${bookmark.line}-${bookmark.url}`}
            title={bookmark.title}
            subtitle={bookmark.description}
            icon={getFavicon(bookmark.url, { fallback: Icon.Bookmark })}
            accessories={[{ text: new URL(bookmark.url).hostname }]}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action.OpenInBrowser url={bookmark.url} />
                  <Action.CopyToClipboard
                    title="Copy URL"
                    content={bookmark.url}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Title"
                    content={bookmark.title}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action.Push
                    title="Edit Bookmark"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    target={
                      <EditBookmarkForm bookmark={bookmark} bookmarksFile={bookmarksFile} onSave={loadBookmarks} />
                    }
                  />
                  <ActionPanel.Submenu
                    title="Move to Group"
                    icon={Icon.ArrowRight}
                    shortcut={{ modifiers: ["cmd"], key: "m" }}
                  >
                    {bookmark.groupName && (
                      <Action key="root" title="Root (No Group)" onAction={() => handleMove(bookmark, "")} />
                    )}
                    {groups
                      .filter((g) => g.name !== bookmark.groupName)
                      .map((group) => (
                        <Action key={group.path} title={group.path} onAction={() => handleMove(bookmark, group.name)} />
                      ))}
                  </ActionPanel.Submenu>
                  <Action
                    title="Delete Bookmark"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    onAction={() => handleDelete(bookmark)}
                  />
                </ActionPanel.Section>
                <ActionPanel.Section>
                  <Action
                    title="Reload Bookmarks"
                    icon={Icon.ArrowClockwise}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                    onAction={loadBookmarks}
                  />
                  <Action
                    title="Reveal Bookmarks File in Finder"
                    icon={Icon.Finder}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
                    onAction={() => showInFinder(bookmarksFile)}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ));

        // Root bookmarks (no group) are rendered without a section header
        if (!groupPath) {
          return bookmarkItems;
        }

        return (
          <List.Section
            key={groupPath}
            title={groupPath}
            subtitle={`${filteredBookmarks.length} bookmark${filteredBookmarks.length !== 1 ? "s" : ""}`}
          >
            {bookmarkItems}
          </List.Section>
        );
      })}
      {!isLoading && bookmarks.length === 0 && (
        <List.EmptyView
          title="No Bookmarks"
          description="Add your first bookmark using the 'New Bookmark' command"
          icon={Icon.Bookmark}
        />
      )}
    </List>
  );
}

interface EditBookmarkFormProps {
  bookmark: BookmarkWithGroup;
  bookmarksFile: string;
  onSave: () => void;
}

function EditBookmarkForm({ bookmark, bookmarksFile, onSave }: EditBookmarkFormProps) {
  const { pop } = useNavigation();
  const [title, setTitle] = useState(bookmark.title);
  const [url, setUrl] = useState(bookmark.url);
  const [description, setDescription] = useState(bookmark.description || "");

  const handleSubmit = () => {
    if (!title.trim() || !url.trim()) {
      showToast({ style: Toast.Style.Failure, title: "Title and URL are required" });
      return;
    }

    try {
      editBookmark(bookmarksFile, bookmark.line, title.trim(), url.trim(), description.trim() || undefined);
      showToast({ style: Toast.Style.Success, title: "Bookmark updated" });
      onSave();
      pop();
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to update bookmark",
        message: String(error),
      });
    }
  };

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Bookmark" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" value={title} onChange={setTitle} />
      <Form.TextField id="url" title="URL" value={url} onChange={setUrl} />
      <Form.TextField
        id="description"
        title="Description"
        value={description}
        onChange={setDescription}
        placeholder="Optional description"
      />
    </Form>
  );
}
