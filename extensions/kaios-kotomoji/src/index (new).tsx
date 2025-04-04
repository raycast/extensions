import { ActionPanel, CopyToClipboardAction, PasteAction, List, showToast, ToastStyle } from "@raycast/api";
import { useState } from "react";
import { AbortError } from "node-fetch";
import { kotomojiLibrary } from "./kotomoji-library";

export default function Command() {
  const { state, search } = useSearch();

  return (
    <List
      searchBarPlaceholder="Search Kotomoji..."
      navigationTitle="KAIOS Kotomoji Archive"
      isLoading={state.isLoading}
      onSearchTextChange={search}
      throttle
    >
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchListItem key={searchResult.id} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
}

function SearchListItem({ searchResult }: { searchResult: SearchResult }) {
  return (
    <List.Item
      title={searchResult.name}
      subtitle={searchResult.description}
      actions={
        <ActionPanel>
          <PasteAction title="Paste Kotomoji" content={searchResult.name} />
          <CopyToClipboardAction title="Copy Kotomoji" content={searchResult.name} />
        </ActionPanel>
      }
    />
  );
}

import { useState } from "react";

function useSearch() {
  const [state, setState] = useState<SearchState>({ results: [], isLoading: false });

  const search = async (searchText: string) => {
    setState({ results: [], isLoading: true });

    try {
      const results = await performSearch(searchText);
      setState({ results, isLoading: false });
    } catch {
      setState({ results: [], isLoading: false });
      await showToast(ToastStyle.Failure, "Search Error", "Something went wrong during search.");
    }
  };

  return { state, search };
}

import { kotomojiLibrary } from "./kotomoji-library";

async function performSearch(searchText: string): Promise<SearchResult[]> {
  const lowercaseKeyword = searchText.toLowerCase();

  const filteredResults = kotomojiLibrary.filter(
    (entry) =>
      entry.name.toLowerCase().includes(lowercaseKeyword) ||
      entry.category.toLowerCase().includes(lowercaseKeyword) ||
      entry.art.includes(searchText),
  );

  return filteredResults.map((entry) => ({
    id: entry.id,
    name: entry.art,
    description: `${entry.name} (${entry.category})`,
  }));
}

interface SearchResult {
  id: string;
  name: string;
  description: string;
}
