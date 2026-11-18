import { Icon, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useMemo, useState } from "react";

import { BrowserItem } from "./components/browser-item";
import { filterBookmarks, loadBookmarks } from "./lib/bookmarks";
import { faviconForUrl, loadFaviconIndex } from "./lib/favicons";
import { activeProfilePath } from "./lib/profile";

export default function Command() {
  const [searchText, setSearchText] = useState("");
  const { data: bookmarks = [], isLoading, error } = usePromise(loadBookmarks, []);
  const filteredBookmarks = useMemo(() => filterBookmarks(bookmarks, searchText), [bookmarks, searchText]);
  const faviconUrls = useMemo(() => bookmarks.map((bookmark) => bookmark.url), [bookmarks]);
  const { data: faviconIndex } = usePromise(
    async (urls: string[]) => loadFaviconIndex(await activeProfilePath("Favicons"), urls),
    [faviconUrls],
    { execute: faviconUrls.length > 0 },
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search bookmarks..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      {error ? (
        <List.EmptyView title="Could Not Read Bookmarks" description={error.message} icon={Icon.XMarkCircle} />
      ) : filteredBookmarks.length === 0 ? (
        <List.EmptyView
          title={bookmarks.length === 0 ? "No Ego Lite Bookmarks" : "No Matching Bookmarks"}
          description={
            bookmarks.length === 0
              ? "Add a bookmark in Ego Lite, then reopen this command."
              : "Try a different title, URL, or folder name."
          }
          icon={Icon.Bookmark}
        />
      ) : (
        filteredBookmarks.map((bookmark, index) => (
          <BrowserItem
            key={`${bookmark.id}-${index}`}
            title={bookmark.title}
            url={bookmark.url}
            icon={faviconIndex ? faviconForUrl(faviconIndex, bookmark.url) : undefined}
            path={bookmark.path}
          />
        ))
      )}
    </List>
  );
}
