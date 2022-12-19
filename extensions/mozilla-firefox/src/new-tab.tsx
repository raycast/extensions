import { useState, ReactElement } from "react";
import { List } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useTabSearch } from "./hooks/useTabSearch";
import { FirefoxListEntries } from "./components";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading: isLoadingHistory, errorView: errorHistory, data: entriesHistory } = useHistorySearch(searchText);
  const { isLoading: isLoadingTabs, errorView: errorTabs, data: entriesTabs } = useTabSearch(searchText);

  if (errorHistory || errorTabs) {
    return errorHistory || errorTabs!;
  }

  return (
    <List onSearchTextChange={setSearchText} isLoading={isLoadingTabs || isLoadingHistory} throttle={false}>
      <List.Section title="New Tab" key="new-tab">
        <FirefoxListEntries.NewTabEntry searchText={searchText} />
      </List.Section>
      <List.Section title="Open Tabs" key="open-tabs">
        {entriesTabs?.map((tab, idx) => (
          <FirefoxListEntries.TabListEntry key={idx} tab={tab} />
        ))}
      </List.Section>
      <List.Section title="Recently Closed" key="recently-closed">
        {entriesHistory?.map((e) => (
          <FirefoxListEntries.HistoryEntry entry={e} key={e.id} />
        ))}
      </List.Section>
    </List>
  );
}
