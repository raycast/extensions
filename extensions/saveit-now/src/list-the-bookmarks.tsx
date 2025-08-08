import { ActionPanel, Action, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { listBookmarks } from "./api";

interface Bookmark {
  id: string;
  url: string;
  title: string;
  summary?: string;
  type: string;
  status: string;
  starred: boolean;
  read: boolean;
  preview?: string;
  faviconUrl?: string;
  ogImageUrl?: string;
  ogDescription?: string;
  createdAt: string;
  metadata?: {
    author?: string;
    publishDate?: string;
  };
  matchedTags?: string[];
  score?: number;
  matchType?: string;
}

export default function Command() {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    loadBookmarks();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadBookmarks(searchText);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText]);

  async function loadBookmarks(query?: string) {
    setIsLoading(true);
    try {
      const results = await listBookmarks({ query });
      setBookmarks(results);
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Load Bookmarks",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsLoading(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search bookmarks..."
      throttle
    >
      {bookmarks.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Bookmark}
          title="No Bookmarks Found"
          description={searchText ? "Try a different search term" : "Save some bookmarks to get started"}
        />
      ) : (
        bookmarks.map((bookmark) => (
          <List.Item
            key={bookmark.id}
            icon={bookmark.starred ? Icon.Star : Icon.Bookmark}
            title={bookmark.title || bookmark.url}
            subtitle={bookmark.summary}
            accessories={(() => {
              const accessories = [];
              if (bookmark.matchedTags && bookmark.matchedTags.length > 0) {
                accessories.push({ tag: bookmark.matchedTags[0] });
              }
              accessories.push({ text: formatDate(bookmark.createdAt) });
              return accessories;
            })()}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={bookmark.url} />
                <Action.CopyToClipboard
                  title="Copy URL"
                  content={bookmark.url}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
                {bookmark.preview && (
                  <Action.OpenInBrowser
                    title="View Preview"
                    url={bookmark.preview}
                    shortcut={{ modifiers: ["cmd"], key: "s" }}
                  />
                )}
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
