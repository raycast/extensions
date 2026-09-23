import { ReactElement } from "react";
import { List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useEditUrlInSearch } from "./hooks/useEditUrlInSearch";
import { HistoryListEntry, NewTabEntry } from "./components";

export default function Command(): ReactElement {
  const { searchText, setSearchText, selectedItemId, editUrlInSearch } = useEditUrlInSearch();
  const { isLoading: isLoadingHistory, errorView: errorHistory, data: entriesHistory } = useHistorySearch(searchText);

  if (errorHistory) {
    return errorHistory;
  }

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      selectedItemId={selectedItemId}
      isLoading={isLoadingHistory}
      throttle={true}
    >
      <List.Section title="New Tab" key="new-tab">
        <NewTabEntry searchText={searchText} />
      </List.Section>
      <List.Section title="Recently Closed" key="recently-closed">
        {entriesHistory?.map((e) => (
          <HistoryListEntry entry={e} key={e.id} onEditUrl={editUrlInSearch} />
        ))}
      </List.Section>
    </List>
  );
}
