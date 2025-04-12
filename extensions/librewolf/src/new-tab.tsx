import { useState, ReactElement } from "react";
import { List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { LibrewolfListEntries } from "./components/LibrewolfListEntries";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading: isLoadingHistory, errorView: errorHistory, data: entriesHistory } = useHistorySearch(searchText);

  if (errorHistory) {
    return errorHistory;
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoadingHistory} throttle={false}>
      <List.Section title="New Tab" key="new-tab">
        <LibrewolfListEntries.NewTabEntry searchText={searchText} />
      </List.Section>
      <List.Section title="Recently Closed" key="recently-closed">
        {entriesHistory?.map((e) => <LibrewolfListEntries.HistoryEntry entry={e} key={e.id} />)}
      </List.Section>
    </List>
  );
}
