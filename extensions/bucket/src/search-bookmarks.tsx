import React from "react";
import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Icon,
  List,
  showHUD,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { deleteBookmark, Bookmark, getBookmarks, updateBookmark, triggerOrganize } from "./lib/api";
import EditBookmarkForm from "./components/EditBookmarkForm";

export default function SearchBookmarks() {
  const [searchText, setSearchText] = useState("");
  const {
    data: bookmarks,
    isLoading,
    error,
    revalidate,
  } = useCachedPromise(getBookmarks, [], {
    keepPreviousData: true,
  });

  const filtered = (bookmarks ?? []).filter((b) => {
    const q = searchText.toLowerCase();
    return (
      !q ||
      b.url.toLowerCase().includes(q) ||
      b.title?.toLowerCase().includes(q) ||
      b.description?.toLowerCase().includes(q) ||
      b.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  async function handleDelete(bookmark: Bookmark) {
    const confirmed = await confirmAlert({
      title: "Delete Bookmark",
      message: `Delete "${bookmark.title || bookmark.url}"?`,
      primaryAction: { title: "Delete", style: Alert.ActionStyle.Destructive },
    });
    if (!confirmed) return;
    try {
      await deleteBookmark(bookmark._id);
      await showHUD("Bookmark deleted");
      revalidate();
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to delete",
        message: String(e),
      });
    }
  }

  async function handleToggleFeatured(bookmark: Bookmark) {
    try {
      await updateBookmark(bookmark._id, { featured: !bookmark.featured });
      revalidate();
      await showToast({
        style: Toast.Style.Success,
        title: bookmark.featured ? "Unfeatured" : "Featured!",
      });
    } catch (e) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to update",
        message: String(e),
      });
    }
  }

  async function handleOrganize() {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: "Running AI organization…",
    });
    try {
      await triggerOrganize();
      toast.style = Toast.Style.Success;
      toast.title = "Organization complete!";
      revalidate();
    } catch (e) {
      toast.style = Toast.Style.Failure;
      toast.title = "Failed";
      toast.message = String(e);
    }
  }

  const { push } = useNavigation();

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search bookmarks by title, URL, or tag…"
      throttle
    >
      {error ? (
        <List.EmptyView
          title="Couldn't load bookmarks"
          description={error instanceof Error ? error.message : String(error)}
        />
      ) : filtered.length === 0 && !isLoading ? (
        <List.EmptyView title="No bookmarks found" description="Try a different search or save a new bookmark." />
      ) : (
        filtered.map((bookmark) => (
          <BookmarkItem
            bookmark={bookmark}
            onDelete={handleDelete}
            onToggleFeatured={handleToggleFeatured}
            onEdit={() => push(<EditBookmarkForm bookmark={bookmark} onSave={revalidate} />)}
            onOrganize={handleOrganize}
            key={bookmark._id}
          />
        ))
      )}
    </List>
  );
}

function BookmarkItem({
  bookmark,
  onDelete,
  onToggleFeatured,
  onEdit,
  onOrganize,
}: {
  bookmark: Bookmark;
  onDelete: (b: Bookmark) => void;
  onToggleFeatured: (b: Bookmark) => void;
  onEdit: () => void;
  onOrganize: () => void;
}) {
  const domain = (() => {
    try {
      return new URL(bookmark.url).hostname;
    } catch {
      return "";
    }
  })();

  const accessories: List.Item.Accessory[] = [];
  if (bookmark.featured)
    accessories.push({
      icon: { source: Icon.Star, tintColor: Color.Yellow },
      tooltip: "Featured",
    });
  if (bookmark.tags?.length) {
    accessories.push({ tag: { value: bookmark.tags[0], color: Color.Blue } });
  }

  return (
    <List.Item
      icon={bookmark.favicon ? { source: bookmark.favicon } : Icon.Link}
      title={bookmark.title || bookmark.url}
      subtitle={domain}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <Action.OpenInBrowser title="Open in Browser" url={bookmark.url} />
            <Action.CopyToClipboard
              title="Copy URL"
              content={bookmark.url}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            <Action.CopyToClipboard
              title="Copy Title"
              content={bookmark.title ?? bookmark.url}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Edit Bookmark"
              icon={Icon.Pencil}
              onAction={onEdit}
              shortcut={{ modifiers: ["cmd"], key: "e" }}
            />
            <Action
              title={bookmark.featured ? "Remove from Featured" : "Mark as Featured"}
              icon={Icon.Star}
              onAction={() => onToggleFeatured(bookmark)}
              shortcut={{ modifiers: ["cmd"], key: "f" }}
            />
            <Action
              title="Run AI Organization"
              icon={Icon.Wand}
              onAction={onOrganize}
              shortcut={{ modifiers: ["cmd", "shift"], key: "o" }}
            />
          </ActionPanel.Section>
          <ActionPanel.Section>
            <Action
              title="Delete Bookmark"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => onDelete(bookmark)}
              shortcut={{ modifiers: ["ctrl"], key: "x" }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
