import { List, ReactElement } from "@raycast/api";
import { useState } from "react";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { HistoryListEntry, NewTabEntry } from "./components";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading, errorView, data } = useHistorySearch(searchText);

  if (errorView) {
    return errorView;
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoading} throttle={true}>
      <List.Section title="New Tab">
        <NewTabEntry searchText={searchText} />
      </List.Section>
      <List.Section title="History">
        {data?.map((e) => (
          <HistoryListEntry entry={e} key={e.id} />
        ))}
      </List.Section>
    </List>
  );
}
