import { List, Icon, LaunchProps } from "@raycast/api";
import { useState } from "react";
import { useSuggestions } from "./utils/suggestions";
import { SuggestionListItem } from "./utils/list-items";
import { partitionSearchWebSuggestions } from "./utils/search-web-results";

export default function SearchWeb(props: LaunchProps) {
  const [searchText, setSearchText] = useState(props.fallbackText ?? "");

  // Fetch suggestions
  const { data: suggestions, isLoading: isLoadingSuggestions } = useSuggestions(searchText);

  const { bangSuggestions, webSuggestions, urlSuggestions } = partitionSearchWebSuggestions(suggestions);

  const isLoading = isLoadingSuggestions;
  const hasResults = bangSuggestions.length > 0 || webSuggestions.length > 0 || urlSuggestions.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search the web..."
      throttle
    >
      {!hasResults && !isLoading && searchText.trim().length > 0 && (
        <List.EmptyView icon={Icon.MagnifyingGlass} title="Nothing found ¯\\_(ツ)_/¯" />
      )}

      {searchText.trim().length === 0 && !isLoading && !hasResults && (
        <List.EmptyView
          icon={Icon.MagnifyingGlass}
          title="Start typing to search"
          description="Search with Helium's current provider or use a bang"
        />
      )}

      {bangSuggestions.length > 0 && (
        <List.Section title="Bangs">
          {bangSuggestions.map((suggestion) => (
            <SuggestionListItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </List.Section>
      )}

      {webSuggestions.length > 0 && (
        <List.Section
          title="Search Web"
          subtitle={`${webSuggestions.length} result${webSuggestions.length !== 1 ? "s" : ""}`}
        >
          {webSuggestions.map((suggestion) => (
            <SuggestionListItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </List.Section>
      )}

      {urlSuggestions.length > 0 && (
        <List.Section title="Open URL">
          {urlSuggestions.map((suggestion) => (
            <SuggestionListItem key={suggestion.id} suggestion={suggestion} />
          ))}
        </List.Section>
      )}
    </List>
  );
}
