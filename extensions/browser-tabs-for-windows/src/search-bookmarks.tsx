import { List, ActionPanel, Action, Icon, LaunchProps } from "@raycast/api";
import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { useBookmarks } from "./hooks/useBookmarks";
import { openBookmarkManager } from "./utils/tabs-helper";

export default function SearchBookmarks(props: LaunchProps) {
  const [query, setQuery] = useState(props.fallbackText || "");
  const { data: bookmarks, isLoading } = useBookmarks();

  const fuse = useMemo(() => {
    return new Fuse(bookmarks, {
      keys: [
        { name: "title", weight: 2 },
        { name: "url", weight: 1 },
        { name: "folder", weight: 0.5 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
    });
  }, [bookmarks]);

  const filteredBookmarks = useMemo(() => {
    if (!query) return bookmarks;
    return fuse.search(query).map((result) => result.item);
  }, [bookmarks, fuse, query]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setQuery}
      searchText={query}
      searchBarPlaceholder="搜索书签..."
    >
      <List.Section title={`Found ${filteredBookmarks.length} bookmarks`}>
        {filteredBookmarks.map((bookmark, index) => (
          <List.Item
            key={`${bookmark.url}-${index}`}
            title={bookmark.title}
            subtitle={bookmark.url}
            icon={getBrowserIcon(bookmark.browser)}
            accessories={[{ text: bookmark.folder, icon: Icon.Folder }]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser url={bookmark.url} />
                <Action.CopyToClipboard
                  content={bookmark.url}
                  title="Copy URL"
                />
                <ActionPanel.Section title="Management">
                  <Action
                    title="Manage Bookmarks (Chrome)"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd"], key: "e" }}
                    onAction={() => openBookmarkManager("chrome")}
                  />
                  <Action
                    title="Manage Favorites (Edge)"
                    icon={Icon.Pencil}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "e" }}
                    onAction={() => openBookmarkManager("edge")}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}

function getBrowserIcon(browser: string): string {
  const map: Record<string, string> = {
    Chrome: "chrome-icon.png",
    Edge: "edge-icon.png",
    Brave: "brave-icon.png",
  };
  return map[browser] || Icon.Globe;
}
