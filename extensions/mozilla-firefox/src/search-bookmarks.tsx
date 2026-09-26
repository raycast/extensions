import { List } from "@raycast/api";
import { ReactElement } from "react";
import { looksLikeUrl } from "./actions";
import { HistoryListEntry, NewTabEntry } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";
import { useEditUrlInSearch } from "./hooks/useEditUrlInSearch";

export default function Command(): ReactElement {
  const { searchText, setSearchText, selectedItemId, editUrlInSearch } = useEditUrlInSearch();
  const { isLoading, errorView, data } = useBookmarkSearch(searchText);

  if (errorView) {
    return errorView;
  }

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      selectedItemId={selectedItemId}
      isLoading={isLoading}
      throttle={true}
    >
      {looksLikeUrl(searchText ?? "") ? (
        <List.Section title="Open URL" key="open-url">
          <NewTabEntry searchText={searchText} />
        </List.Section>
      ) : null}
      {data?.map((e) => (
        <HistoryListEntry entry={e} key={e.id} onEditUrl={editUrlInSearch} />
      ))}
    </List>
  );
}
