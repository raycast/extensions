import { List } from "@raycast/api";
import { useState, useMemo } from "react";
import { SearchResult } from "@components/search-result";
import { useSpotlight } from "@hooks/use-spotlight";
import { makeFriendly, base64Encode } from "@utils/path-helpers";

export const SpotlightResults = ({ query }: { query: string }) => {
  const [searchText, setSearchText] = useState(query || "");

  const { isLoading, data } = useSpotlight(searchText, {
    keepPreviousData: true,
    execute: !!searchText,
    failureToastOptions: { title: "Error querying Spotlight" },
  });

  const searchResults = useMemo((): SearchResult[] => {
    if (!searchText.length || !data || !data.length) return [];
    return data.split("\n").map((row: string) => {
      const originalPath = row.trim();
      const path = makeFriendly(originalPath);
      const key = base64Encode(originalPath);
      return { key, score: "", path, originalPath } as SearchResult;
    });
  }, [data, searchText]);

  return (
    <List
      navigationTitle="Spotlight Results"
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search Spotlight for directories..."
    >
      <List.Section title="Results" subtitle={searchResults.length.toString()}>
        {searchResults.map((searchResult: SearchResult) => (
          <SearchResult key={searchResult.key} searchResult={searchResult} />
        ))}
      </List.Section>
    </List>
  );
};

export default SpotlightResults;
