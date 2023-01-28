import { LaunchProps, List } from "@raycast/api";

import useSearch from "./hooks/useSearch";
import SearchResultItem from "./components/SearchResultItem";

export default function Command({ launchContext }: LaunchProps) {
  const { searchText: initialSearchText = "" } = (launchContext as { searchText: string }) || {};
  const { state, search, searchText, addToHistory } = useSearch(initialSearchText);

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
          <SearchResultItem key={searchResult.id} searchResult={searchResult} addToHistory={addToHistory} />
        ))}
      </List.Section>
    </List>
  );
}
