import {
  Action,
  ActionPanel,
  Form,
  Icon,
  List,
  LocalStorage,
  Toast,
  open,
  showToast,
  useNavigation,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { deleteBookmark } from "./lib/bookmark-delete";
import { getBookmarks } from "./lib/bookmark-get";
import type { BookmarkItem } from "./lib/types";
import { updateLastAccessed } from "./lib/utils";

const handleOpenUrl = async (bookmark: BookmarkItem) => {
  try {
    await updateLastAccessed(bookmark.id);
    await open(bookmark.url);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open URL",
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export default function OpenCommand() {
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { push } = useNavigation();

  useEffect(() => {
    loadBookmarks();
  }, []);

  const loadBookmarks = async () => {
    try {
      const items = await getBookmarks();
      setBookmarks(items);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "An error occurred",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBookmark = async (id: string) => {
    await deleteBookmark(id);
    loadBookmarks();
    await showToast({
      style: Toast.Style.Success,
      title: "Link deleted",
    });
  };

  const handleEditBookmark = (bookmark: BookmarkItem) => {
    push(<EditBookmarkForm bookmark={bookmark} onEdit={loadBookmarks} />);
  };

  function EditBookmarkForm({
    bookmark,
    onEdit,
  }: {
    bookmark: BookmarkItem;
    onEdit: () => void;
  }) {
    const { pop } = useNavigation();
    const [url, setUrl] = useState(bookmark.url);
    const [title, setTitle] = useState(bookmark.title);

    const handleSubmit = async () => {
      if (!url.trim() || !title.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Missing fields",
          message: "URL and title are required",
        });
        return;
      }

      // Update the bookmark with new values
      const updatedBookmark: BookmarkItem = {
        ...bookmark,
        url: url.trim(),
        title: title.trim(),
      };

      // Save updated bookmark (this will overwrite the existing one)
      await LocalStorage.setItem(bookmark.id, JSON.stringify(updatedBookmark));

      await showToast({
        style: Toast.Style.Success,
        title: "Bookmark updated",
      });

      onEdit();
      pop();
    };

    return (
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Update Bookmark"
              onSubmit={handleSubmit}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="url"
          title="URL"
          value={url}
          onChange={setUrl}
          placeholder="https://example.com"
        />
        <Form.TextField
          id="title"
          title="Title"
          value={title}
          onChange={setTitle}
          placeholder="Page title"
        />
      </Form>
    );
  }

  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();

    const diffSeconds = Math.floor(diffTime / 1000);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    // Within 1 minute - show seconds
    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    }

    // Within 1 hour - show minutes
    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    // Within 24 hours - show hours
    if (diffHours < 24) {
      return `${diffHours}h ago`;
    }

    // More than 24 hours - use existing logic
    if (diffDays === 1) {
      return "Yesterday";
    }
    if (diffDays < 7) {
      return `${diffDays} days ago`;
    }
    return date.toLocaleDateString("en-US");
  };

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search links..."
      filtering={true}
    >
      {bookmarks.length === 0 ? (
        <List.EmptyView
          icon={Icon.Bookmark}
          title="No saved links"
          description="Use add commands to add links"
        />
      ) : (
        bookmarks.map((bookmark) => (
          <List.Item
            key={bookmark.id}
            title={bookmark.title}
            subtitle={bookmark.url}
            accessories={[{ text: ` ${formatDate(bookmark.lastAccessedAt)}` }]}
            keywords={[bookmark.title, bookmark.url]}
            actions={
              <ActionPanel>
                <Action
                  title="Open URL"
                  icon={Icon.Globe}
                  onAction={() => handleOpenUrl(bookmark)}
                />
                <Action
                  title="Edit Bookmark"
                  icon={Icon.Pencil}
                  onAction={() => handleEditBookmark(bookmark)}
                />
                <Action
                  title="Delete Link"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={() => handleDeleteBookmark(bookmark.id)}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
