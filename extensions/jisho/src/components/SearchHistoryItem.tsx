import { Action, ActionPanel, LaunchType, List, launchCommand } from "@raycast/api";

import { SearchHistoryItem } from "../types/types";
import SearchResultItem from "./SearchResultItem";

const noop = () => null;

const launchSearch = async (searchText: string) => {
  await launchCommand({
    name: "search",
    type: LaunchType.UserInitiated,
    context: {
      searchText,
    },
  });
};

export default function SearchHistoryItem({ searchHistoryItem }: { searchHistoryItem: SearchHistoryItem }) {
  if (searchHistoryItem.type === "result") {
    return <SearchResultItem searchResult={searchHistoryItem} onChoose={noop} />;
  } else {
    return (
      <List.Item
        title={searchHistoryItem.query}
        actions={
          <ActionPanel>
            <ActionPanel.Section>
              <Action title="Search again" onAction={launchSearch.bind(null, searchHistoryItem.query)} />
            </ActionPanel.Section>
          </ActionPanel>
        }
      />
    );
  }
}
