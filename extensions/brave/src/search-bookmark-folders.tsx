import { List } from "@raycast/api";
import { BraveListItems } from "./components/BraveListItems";
import { useBookmarkFolderSearch } from "./hooks/useBookmarkFolderSearch";

export default function Command() {
  const { errorView, isLoading, data, profile } = useBookmarkFolderSearch();

  if (errorView) {
    return errorView;
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search in bookmark folders...">
      <List.Section title="Bookmark Folders">
        {data?.map((e) => (
          <BraveListItems.BookmarkFolder key={e.id} entry={e} profile={profile.id} />
        ))}
      </List.Section>
    </List>
  );
}
