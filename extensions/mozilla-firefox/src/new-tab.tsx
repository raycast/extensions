import { useState, ReactElement } from "react";
import { List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { FirefoxListEntries } from "./components";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading: isLoadingHistory, errorView: errorHistory, data: entriesHistory } = useHistorySearch(searchText);

  if (errorHistory) {
    return errorHistory;
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoadingHistory} throttle={false}>
      <List.Section title="New Tab" key="new-tab">
        <FirefoxListEntries.NewTabEntry searchText={searchText} />
      </List.Section>
      <List.Section title="Recently Closed" key="recently-closed">
        {entriesHistory?.map((e) => (
          <FirefoxListEntries.HistoryEntry entry={e} key={e.id} />
        ))}
      </List.Section>
    </List>
  );
}
