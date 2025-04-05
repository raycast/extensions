import { getPreferenceValues, List, showToast, Toast } from "@raycast/api";
import SearchListItem from "./components/search-list-item";
import useLinkding from "./hooks/use-linkding";

export default function searchLinkding() {
  const preferences = getPreferenceValues<Preferences>();
  const { bookmarks, isLoading, setSearchText, deleteBookmark } = useLinkding();

  const onDeleteItem = (id: number) => deleteBookmark(id);
  const onCopyItem = () => showToast({ style: Toast.Style.Success, title: "Success", message: "Copied to clipboard" });

  return (
    <List isLoading={isLoading} onSearchTextChange={setSearchText} searchBarPlaceholder="Search through bookmarks...">
      <List.Section title="Results" subtitle={bookmarks.length.toString()}>
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
