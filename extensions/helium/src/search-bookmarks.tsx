import { List, ActionPanel, Icon, Action, showToast, Toast } from "@raycast/api";
import { usePromise, getFavicon } from "@raycast/utils";
import { useState } from "react";
import { getBookmarks } from "./utils/bookmarks";
import {
  OpenBookmarkAction,
  OpenBookmarkInNewTabAction,
  OpenNewTabAction,
  CopyBookmarkUrlAction,
  CopyBookmarkTitleAction,
  CopyBookmarkAsMarkdownAction,
  CreateQuicklinkAction,
} from "./utils/actions";
import { Bookmark } from "./types";
import { filterSearchable } from "./utils/search";

export default function SearchBookmarks() {
  const [searchText, setSearchText] = useState("");
  const { data: bookmarks, isLoading, error, revalidate } = usePromise(getBookmarks);

  // Filter bookmarks based on search text
  const filteredBookmarks = bookmarks ? filterSearchable(bookmarks, searchText) : [];

  // Show error state
  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.XMarkCircle}
          title="Failed to Load Bookmarks"
          description="There was an error reading your bookmarks file. Make sure Helium is installed and you have bookmarks saved."
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search bookmarks by title or URL..."
      onSearchTextChange={setSearchText}
      throttle={true}
    >
      {filteredBookmarks.length === 0 && !isLoading && (
        <List.EmptyView
          icon={Icon.Bookmark}
          title={searchText ? "No Bookmarks Found" : "No Bookmarks"}
          description={
            searchText
              ? "Try a different search query"
              : "You don't have any bookmarks yet. Start bookmarking pages in Helium!"
          }
        />
      )}
      {filteredBookmarks.map((bookmark) => (
        <BookmarkListItem key={bookmark.id} bookmark={bookmark} revalidate={revalidate} />
      ))}
    </List>
  );
}

function BookmarkListItem({ bookmark, revalidate }: { bookmark: Bookmark; revalidate: () => void }) {
  const accessories: List.Item.Accessory[] = [];

  // Add folder information if available
  if (bookmark.folder) {
    accessories.push({
      text: bookmark.folder,
      icon: Icon.Folder,
    });
  }

  return (
    <List.Item
      title={bookmark.title || "Untitled"}
      subtitle={bookmark.url}
      keywords={[bookmark.url, bookmark.title]}
      icon={getFavicon(bookmark.url, { fallback: Icon.Bookmark })}
      accessories={accessories}
      actions={
        <ActionPanel>
          <ActionPanel.Section>
            <OpenBookmarkAction bookmark={bookmark} />
            <OpenBookmarkInNewTabAction bookmark={bookmark} />
            <OpenNewTabAction />
            <CopyBookmarkUrlAction bookmark={bookmark} />
            <CopyBookmarkTitleAction bookmark={bookmark} />
            <CopyBookmarkAsMarkdownAction bookmark={bookmark} />
            <CreateQuicklinkAction url={bookmark.url} name={bookmark.title || "Untitled"} />
            <Action.Open
              title="Open in Default Browser"
              target={bookmark.url}
              icon={Icon.Globe}
              shortcut={{ modifiers: ["cmd", "opt"], key: "o" }}
            />
            <Action
              title="Reload Bookmarks"
              icon={Icon.ArrowClockwise}
              shortcut={{ modifiers: ["cmd"], key: "r" }}
              onAction={async () => {
                await showToast({
                  style: Toast.Style.Animated,
                  title: "Reloading bookmarks...",
                });
                await revalidate();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Bookmarks reloaded",
                });
              }}
            />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
