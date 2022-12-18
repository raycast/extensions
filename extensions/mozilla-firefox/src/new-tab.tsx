import { List, showToast, Toast } from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { useState, ReactElement } from "react";
import { useTabSearch } from "./hooks/useTabSearch";
import { FirefoxListEntries } from "./components";
import { DEFAULT_ERROR_TITLE, NOT_INSTALLED_MESSAGE } from "./constants";
import { NotInstalled } from "./components/NotInstalled";

export default function Command(): ReactElement {
  const [searchText, setSearchText] = useState<string>();
  const { isLoading: isLoadingHistory, error: errorHistory, entries: entriesHistory } = useHistorySearch(searchText);
  const { isLoading: isLoadingTabs, error: errorTabs, entries: entriesTabs } = useTabSearch(searchText);

  if (errorTabs) {
    if (errorTabs === NOT_INSTALLED_MESSAGE) {
      return <NotInstalled />;
    }
    showToast(Toast.Style.Failure, DEFAULT_ERROR_TITLE, errorTabs?.toString());
  }

  if (errorHistory) {
    return errorHistory;
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
