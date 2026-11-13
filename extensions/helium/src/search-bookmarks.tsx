import { List, Icon } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import { useState } from "react";
import { getBookmarks } from "./utils/bookmarks";
import { BookmarkListItem } from "./utils/list-items";
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
