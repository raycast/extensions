import { Action, ActionPanel, Icon, LaunchType, List, launchCommand } from "@raycast/api";

import { SearchHistoryItem } from "../types/types";
import SearchResultItem from "./SearchResultItem";

const launchSearch = async (searchText: string) => {
  await launchCommand({
    name: "search",
    type: LaunchType.UserInitiated,
    context: {
      searchText,
    },
  });
};

export default function SearchHistoryItem({
  searchHistoryItem,
  addToHistory,
}: {
  searchHistoryItem: SearchHistoryItem;
  addToHistory: (result: SearchHistoryItem) => void;
}) {
  if (searchHistoryItem.type === "result") {
    return <SearchResultItem searchResult={searchHistoryItem} addToHistory={addToHistory} />;
  } else {
    return (
      <List.Item
        title={searchHistoryItem.query}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action
                title="Search again"
                icon={Icon.MagnifyingGlass}
                onAction={() => {
                  addToHistory(searchHistoryItem);
                  launchSearch(searchHistoryItem.query);
                }}
              />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }
}
