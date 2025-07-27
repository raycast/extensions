import { getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import { useMemo } from "react";
import SearchListItem from "./components/search-list-item";
import useBookmarks from "./hooks/use-bookmarks";

export default function searchLinkding() {
  const preferences = getPreferenceValues<Preferences>();
  const { isLoading, bookmarks, setFilter, deleteBookmark } = useBookmarks();

  const onDeleteItem = (id: number) => deleteBookmark(id);
  const onCopyItem = () => showToast({ style: Toast.Style.Success, title: "Success", message: "Copied to clipboard" });

  const subtitle = useMemo(() => {
    if (bookmarks.length > 100) return "100+";
    return bookmarks.length.toString();
  }, [bookmarks]);

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={setFilter}
      throttle
      searchBarPlaceholder="Search through bookmarks..."
    >
      <List.Section title="Results" subtitle={subtitle}>
        {bookmarks.map((bookmark) => (
          <SearchListItem
            key={bookmark.id}
            bookmark={bookmark}
            preferences={preferences}
            onCopy={onCopyItem}
            onDelete={onDeleteItem}
          />
        ))}
      </List.Section>
    </List>
  );
}
