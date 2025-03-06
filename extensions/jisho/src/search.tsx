import { LaunchProps, List } from "@raycast/api";

import SearchResultItem from "./components/SearchResultItem";
import useSearch from "./hooks/useSearch";
import { useSearchHistory } from "./hooks/useSearchHistory";

export default function Command({ launchContext }: LaunchProps) {
  const { searchText: initialSearchText = "" } = (launchContext as { searchText: string }) || {};
  const { state, setSearchText: search, searchText } = useSearch(initialSearchText);

  const { addToHistory, removeFromHistory } = useSearchHistory(searchText);

  return (
    <List
      isLoading={state.isLoading}
      searchText={searchText}
      onSearchTextChange={search}
      searchBarPlaceholder="Search..."
      throttle
    >
      <List.Section title="Results" subtitle={state.results.length + ""}>
        {state.results.map((searchResult) => (
          <SearchResultItem
            key={searchResult.id}
            searchResult={searchResult}
            addToHistory={addToHistory}
            removeFromHistory={removeFromHistory}
          />
        ))}
      </List.Section>
    </List>
  );
}
