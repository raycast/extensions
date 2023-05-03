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

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search for movie / tv show name"
      throttle
      onSearchTextChange={onSearchTextChange}
    >
      {searchTerm === "" && searchResults.length === 0 ? (
        <List.EmptyView title="Search for movie / tv show name" description="Minimum of 3 characters" />
      ) : (
        <List.Section title="Results" subtitle={searchResults.length + ""}>
          {searchResults.map((result: SearchResult) => (
            <SearchResultListItem key={result.url} result={result} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
