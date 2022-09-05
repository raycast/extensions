import { ActionPanel, CopyToClipboardAction, getPreferenceValues, List, OpenInBrowserAction } from "@raycast/api";

import { useSearch } from "./utils/useSearch";

import { SearchResult } from "./utils/types";

export default function Command() {
  const { isLoading, history, results, searchText, search, addHistory, deleteAllHistory, deleteHistoryItem } =
    useSearch();

  const listItems: SearchResult[] = searchText.length === 0 ? history : results;

  return (
    <List
      isLoading={isLoading}
      onSearchTextChange={search}
      searchBarPlaceholder="Search PHP Docs..."
      throttle
    >
      <List.Section title="Results" subtitle={listItems.length + ""}>
        {listItems.map((item) => (
          <List.Item
            key={item.id}
            title={item.description}
            icon="php.png"
            actions={
                <ActionPanel>
                    <OpenInBrowserAction url={item.url} />
                    <CopyToClipboardAction title="Copy URL" content={item.url} />
                </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
