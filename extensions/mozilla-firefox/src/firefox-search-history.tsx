import { List, showToast, Toast } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useState, ReactElement } from "react";
import { ListEntries } from "./components";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading: isLoadingHistory, error: errorHistory, entries: entriesHistory } = useHistorySearch(searchText);

  if (errorHistory) {
    showToast(Toast.Style.Failure, "An Error Occurred", errorHistory?.toString());
  }

  return (
    <List
      onSearchTextChange={function (query) {
        setSearchText(query);
      }}
      isLoading={isLoadingHistory}
      throttle={false}
    >
      {entriesHistory?.map((e) => (
        <ListEntries.HistoryEntry entry={e} key={e.id} />
      ))}
    </List>
  );
}
