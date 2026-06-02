import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  useNavigation,
  Color,
  getPreferenceValues,
} from "@raycast/api";
import React from "react";
import { DisplayTab } from "../types";
import { useSearch } from "../hooks/useWebSearch";
import { forceCopy } from "../helpers";

import { SearchResult } from "../utils/searchTypes";

// V-CORE: Optimized Action Panel for Tab Search
const TabSearchActionPanel = React.memo(
  ({
    result,
    onSearch,
    onSetQuery,
  }: {
    result: SearchResult;
    onSearch: (q: string, u: string) => void;
    onSetQuery: (q: string) => void;
  }) => (
    <ActionPanel>
      <ActionPanel.Section title="Surgical Action">
        <Action
          title="Search in Tab"
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Purple }}
          onAction={() => onSearch(result.query, result.url)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Quick Search">
        <Action
          title="Set Search Query"
          icon={{ source: Icon.Pencil, tintColor: Color.Purple }}
          onAction={() => onSetQuery(result.query)}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Utilities">
        <Action
          title="Copy URL"
          icon={{ source: Icon.CopyClipboard, tintColor: Color.SecondaryText }}
          shortcut={{ modifiers: ["shift"], key: "c" }}
          onAction={() => {
            forceCopy(result.url);
            showToast({ style: Toast.Style.Success, title: "Copied URL", message: result.url });
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  ),
);

export function TabSearchView({
  tab,
  navigateTab,
  onSearchComplete,
}: {
  tab: DisplayTab;
  navigateTab: (tab: DisplayTab, url: string, silent?: boolean) => void;
  onSearchComplete?: () => void;
}) {
  const { results, isLoading, searchText, setSearchText } = useSearch();
  const { pop } = useNavigation();

  const handleSearch = (query: string, url: string) => {
    showToast(Toast.Style.Success, `Searching for "${query}" in background...`);
    navigateTab(tab, url, true);
    onSearchComplete?.();
    pop();
  };

  const handleSearchTextChange = (text: string) => {
    const clearKey = (getPreferenceValues() as { clearSearchKey?: string }).clearSearchKey || "'";
    if (text === clearKey || text.endsWith(clearKey)) {
      pop();
      return;
    }
    setSearchText(text);
  };

  return (
    <List
      navigationTitle={tab.displayTitle}
      isLoading={isLoading}
      filtering={false}
      searchText={searchText}
      onSearchTextChange={handleSearchTextChange}
      searchBarPlaceholder="Search Google or enter lucky search..."
      throttle={false}
    >
      {results.map((result) => (
        <List.Item
          key={result.id}
          icon={result.icon}
          title={result.query}
          subtitle={result.id === "static-result" ? result.description : undefined}
          accessories={[]}
          actions={<TabSearchActionPanel result={result} onSearch={handleSearch} onSetQuery={setSearchText} />}
        />
      ))}
    </List>
  );
}
