import { List, Action, ActionPanel, Icon, LaunchProps } from "@raycast/api";
import { useState } from "react";
import { useSuggestions, getSearchEngineName } from "./utils/suggestions";
import type { Suggestion } from "./types";
import { CreateQuicklinkAction } from "./utils/actions";
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

/**
 * List item for a search suggestion
 */
function SuggestionListItem({ suggestion }: { suggestion: Suggestion }) {
  const searchEngineName = getSearchEngineName();
  const isUrlType = suggestion.type === "url";
  const isBangType = suggestion.type === "bang";
  const providerName = suggestion.providerName ?? searchEngineName;

  const title = isUrlType ? `Open ${suggestion.query}` : isBangType ? `Open ${providerName}` : suggestion.query;
  const subtitle = isUrlType ? "Open URL" : isBangType ? suggestion.query : `Search with ${providerName}`;

  return (
    <List.Item
      title={title}
      subtitle={subtitle}
      icon={isUrlType ? Icon.Link : Icon.MagnifyingGlass}
      actions={
        <ActionPanel>
          <Action.Open
            title={isUrlType ? "Open URL" : isBangType ? `Open ${providerName}` : "Search"}
            target={suggestion.url}
            application="net.imput.helium"
          />
          <Action.CopyToClipboard
            title="Copy URL"
            content={suggestion.url}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          <Action.CopyToClipboard
            title="Copy Query"
            content={suggestion.query}
            shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
          />
          <CreateQuicklinkAction url={suggestion.url} name={suggestion.query} />
        </ActionPanel>
      }
    />
  );
}
