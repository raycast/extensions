import { useState, ReactElement } from "react";
import { List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useOpenTabs } from "./hooks/useOpenTabs";
import { HistoryListEntry, NewTabEntry, TabListEntry } from "./components";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState("");
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>();
  const { isLoading: isLoadingHistory, errorView: errorHistory, data: entriesHistory } = useHistorySearch(searchText);
  const openTabs = useOpenTabs(searchText);

  if (errorHistory) {
    return errorHistory;
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
      isLoading={isLoadingHistory}
      throttle={false}
    >
      {openTabs.length > 0 ? (
        <List.Section title="Open Tabs" key="open-tabs">
          {openTabs.map((tab) => (
            <TabListEntry tab={tab} key={`${tab.url}-${tab.title}`} onEditUrl={editUrlInSearch} />
          ))}
        </List.Section>
      ) : null}
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
