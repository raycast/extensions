import { getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import SearchListItem from "./components/search-list-item";
import useBookmarks from "./hooks/use-bookmarks";
import useFilteredBookmarks from "./hooks/use-filtered-bookmarks";

export default function searchLinkding() {
  const preferences = getPreferenceValues<Preferences>();
  const { isLoading, filteredBookmarks, setFilter } = useFilteredBookmarks();
  const { deleteBookmark } = useBookmarks();

  const onDeleteItem = (id: number) => deleteBookmark(id);
  const onCopyItem = () => showToast({ style: Toast.Style.Success, title: "Success", message: "Copied to clipboard" });

  return (
    <List isLoading={isLoading} onSearchTextChange={setFilter} searchBarPlaceholder="Search through bookmarks...">
      <List.Section title="Results" subtitle={filteredBookmarks.length.toString()}>
        {filteredBookmarks.map((bookmark) => (
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
