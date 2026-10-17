import { List } from "@raycast/api";
import { useMemo } from "react";
import { BookmarksProvider, useBookmarksContext } from "./bookmarks-context";
import { SearchListItem } from "./components/search-list-item";

function SearchBookmarksList() {
  const { isLoading, bookmarks, onSearchTextChange } = useBookmarksContext();

  const subtitle = useMemo(() => {
    if (bookmarks.length > 100) return "100+";
    return bookmarks.length.toString();
  }, [bookmarks]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={onSearchTextChange}
      throttle
      searchBarPlaceholder="Search through bookmarks..."
    >
      <List.Section title="Results" subtitle={subtitle}>
        {bookmarks.map((bookmark) => (
          <SearchListItem key={bookmark.id} bookmark={bookmark} />
        ))}
      </List.Section>
    </List>
  );
}

export default function searchLinkding() {
  return (
    <BookmarksProvider>
      <SearchBookmarksList />
    </BookmarksProvider>
  );
}
