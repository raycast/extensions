import { List } from "@raycast/api";
import { useState, ReactElement } from "react";
import { HistoryListEntry, NewTabEntry } from "./components";
import { useBookmarkSearch } from "./hooks/useBookmarkSearch";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const { isLoading, errorView, data } = useBookmarkSearch(searchText);

  if (errorView) {
    return errorView;
  }

  function editUrlInSearch(url: string) {
    setSearchText(url);
    setSelectedItemId("new-tab");
    setTimeout(() => setSelectedItemId(undefined), 0);
  }

  return (
    <List
      searchText={searchText}
      onSearchTextChange={setSearchText}
      selectedItemId={selectedItemId}
      isLoading={isLoading}
      throttle={false}
    >
      <List.Section title="Open URL" key="open-url">
        <NewTabEntry searchText={searchText} />
      </List.Section>
      {data?.map((e) => (
        <HistoryListEntry entry={e} key={e.id} onEditUrl={editUrlInSearch} />
      ))}
    </List>
  );
}
