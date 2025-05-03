import { List } from "@raycast/api";
import { useState } from "react";
import { getSuggestions } from "./utils/api";
import { SearchResult } from "./interface/search-result";
import { SearchResultListItem } from "./components/SearchResultListItem";

export default function Command() {
  const [searchTerm, setSearchTerm] = useState("");

  const [isLoading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);

  function onSearchTextChange(searchTerm: string) {
    setSearchTerm(searchTerm);
    if (searchTerm.length === 0) {
      setSearchResults([]);
      return;
    }
    if (searchTerm.length > 3) {
      setLoading(true);
      getSuggestions(searchTerm).then((results) => {
        setSearchResults(results);
        setLoading(false);
      });
    }
  }

  let emptyTitle = "Search for movie / tv show name";
  let emptyDescription = "Minimum of 4 characters";
  if (isLoading) {
    emptyTitle = "Loading...";
    emptyDescription = "Please wait while we are fetching the results";
  } else if (searchTerm.length >= 4 && searchResults.length === 0) {
    emptyTitle = "No Result";
    emptyDescription = "Try searching for something else";
  }

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for movie / tv show name"
      throttle
      onSearchTextChange={onSearchTextChange}
    >
      <List.EmptyView title={emptyTitle} description={emptyDescription} />
      <List.Section title="Results" subtitle={searchResults.length + ""}>
        {searchResults.map((result: SearchResult) => (
          <SearchResultListItem key={result.url} result={result} />
        ))}
      </List.Section>
    </List>
  );
}
