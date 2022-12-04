import { List, showToast, Toast } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useState, ReactElement } from "react";
import { useTabSearch } from "./hooks/useTabSearch";
import { ListEntries } from "./components";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading: isLoadingHistory, error: errorHistory, entries: entriesHistory } = useHistorySearch(searchText);
  const { isLoading: isLoadingTabs, error: errorTabs, entries: entriesTabs } = useTabSearch(searchText);

  if (errorHistory || errorTabs) {
    const error = errorHistory || errorTabs;
    showToast(Toast.Style.Failure, "An Error Occurred", error?.toString());
  }

  return (
    <List
      onSearchTextChange={function (query) {
        setSearchText(query);
      }}
      isLoading={isLoadingTabs || isLoadingHistory}
      throttle={false}
    >
      <List.Section title="New Tab" key="new-tab">
        <ListEntries.NewTabEntry searchText={searchText} />
      </List.Section>
      <List.Section title="Open Tabs" key="open-tabs">
        {(entriesTabs || []).map((tab, idx) => (
          <ListEntries.TabListEntry key={idx} tab={tab} />
        ))}
      </List.Section>
      <List.Section title="Recently Closed" key="recently-closed">
        {entriesHistory?.map((e) => (
          <ListEntries.HistoryEntry entry={e} key={e.id} />
        ))}
      </List.Section>
    </List>
  );
}
