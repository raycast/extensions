import { useState } from "react";
import {
  getPreferenceValues,
  Icon,
  List,
  ActionPanel,
  Action,
} from "@raycast/api";
import { useHistorySearch } from "./hooks/useHistorySearch";
import { CometListItems } from "./components";
import { useTabSearch } from "./hooks/useTabSearch";
import { Preferences } from "./interfaces";
import { openNewTab } from "./actions";

export default function Command() {
  const [searchText, setSearchText] = useState<string>("");
  const {
    data: dataTab,
    isLoading: isLoadingTab,
    errorView: errorViewTab,
  } = useTabSearch(searchText || "");
  const { data: historyData, isLoading: isLoadingHistory } = useHistorySearch(
    "Default",
    searchText,
  );
  const { useOriginalFavicon } = getPreferenceValues<Preferences>();

  // Handle error views
  if (errorViewTab) {
    return errorViewTab;
  }

  // Determine the primary action based on input
  let actionTitle = "Open Empty Tab";
  let actionIcon = Icon.Plus;
  let actionHandler = async () => await openNewTab({});

  if (searchText) {
    if (searchText.startsWith("http://") || searchText.startsWith("https://")) {
      actionTitle = `Open URL "${searchText}"`;
      actionIcon = Icon.Globe;
      actionHandler = async () => await openNewTab({ url: searchText });
    } else {
      actionTitle = `Search "${searchText}"`;
      actionIcon = Icon.MagnifyingGlass;
      actionHandler = async () => await openNewTab({ query: searchText });
    }
  }

  return (
    <List
      onSearchTextChange={setSearchText}
      isLoading={isLoadingTab || isLoadingHistory}
      searchBarPlaceholder="Enter URL or search query..."
    >
      <List.Section key={"new-tab"} title={"New Tab"}>
        <List.Item
          title={actionTitle}
          icon={actionIcon}
          actions={
            <ActionPanel>
              <Action title={actionTitle} onAction={actionHandler} />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section key={"open-tabs"} title={"Open Tabs - All"}>
        {dataTab?.map((tab) => (
          <CometListItems.TabList
            key={tab.key()}
            tab={tab}
            useOriginalFavicon={useOriginalFavicon}
          />
        ))}
      </List.Section>

      <List.Section key={"history"} title={"History"}>
        {historyData?.map((entry) => (
          <CometListItems.TabHistory
            key={`history-${entry.id}`}
            entry={entry}
            profile="Default"
            type="History"
          />
        ))}
      </List.Section>
    </List>
  );
}
