import { List } from "@raycast/api";
import { useMemo, useState } from "react";
import { useCachedPromise } from "@raycast/utils";
import { getSuggestions } from "./utils/api";
import { SearchResult } from "./interface/search-result";
import { SearchResultListItem } from "./components/SearchResultListItem";

const MIN_SEARCH_LENGTH = 2;

type MediaFilter = "all" | "show" | "film";

export default function Command() {
  const [searchTerm, setSearchTerm] = useState("");
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  const normalizedSearchTerm = searchTerm.trim();

  const { data: searchResults = [], isLoading } = useCachedPromise(
    async (query: string) => getSuggestions(query),
    [normalizedSearchTerm],
    {
      execute: normalizedSearchTerm.length >= MIN_SEARCH_LENGTH,
      keepPreviousData: true,
      failureToastOptions: {
        title: "Could not search Binge Clock",
        message: "Check your connection and try again",
      },
    }
  );

  const filteredResults = useMemo(() => {
    if (mediaFilter === "all") {
      return searchResults;
    }

    return searchResults.filter((result) => result.type === mediaFilter);
  }, [mediaFilter, searchResults]);

  let emptyTitle = "Search for a movie or TV show";
  let emptyDescription = `Type at least ${MIN_SEARCH_LENGTH} characters`;
  if (normalizedSearchTerm.length >= MIN_SEARCH_LENGTH && isLoading) {
    emptyTitle = "Loading...";
    emptyDescription = "Fetching results from Binge Clock";
  } else if (normalizedSearchTerm.length >= MIN_SEARCH_LENGTH && filteredResults.length === 0) {
    if (searchResults.length > 0) {
      emptyTitle = "No Matches for Filter";
      emptyDescription = "Try another filter or search term";
    } else {
      emptyTitle = "No Results";
      emptyDescription = "Try another title";
    }
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search for movie / TV show"
      throttle
      onSearchTextChange={setSearchTerm}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Type"
          value={mediaFilter}
          onChange={(value) => setMediaFilter(value as MediaFilter)}
        >
          <List.Dropdown.Item title="All" value="all" />
          <List.Dropdown.Item title="TV Shows" value="show" />
          <List.Dropdown.Item title="Movies" value="film" />
        </List.Dropdown>
      }
    >
      <List.EmptyView title={emptyTitle} description={emptyDescription} />
      <List.Section title="Results" subtitle={filteredResults.length + ""}>
        {filteredResults.map((result: SearchResult) => (
          <SearchResultListItem key={result.id} result={result} />
        ))}
      </List.Section>
    </List>
  );
}
