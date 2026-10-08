import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  Color,
} from "@raycast/api";
import { useShodanSearch } from "./hooks/useShodanSearch";
import { useFavorites } from "./hooks/useFavorites";
import { useApiCredits } from "./hooks/useApiCredits";
import { useQueryHistory } from "./hooks/useQueryHistory";
import { HostDetailView } from "./components/HostDetailView";
import { EmptyStates } from "./components/EmptyStates";
import {
  getPortColor,
  getServiceNameForPort,
  truncateString,
  formatCredits,
} from "./utils/formatters";
import { copyAsCSV, copyAsJSON } from "./utils/export";
import { getQuerySuggestions, QUICK_FILTERS } from "./utils/query-suggestions";

export default function SearchCommand() {
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [showAutocomplete, setShowAutocomplete] = useState(true);
  const { push } = useNavigation();
  const { addFavorite } = useFavorites();
  const { queryCredits } = useApiCredits();
  const { addToHistory } = useQueryHistory();
  const lastTrackedQuery = useRef<string>("");

  const { results, total, isLoading } = useShodanSearch({
    query: submittedQuery,
    enabled: submittedQuery.length > 0,
  });

  // Track successful searches in history
  useEffect(() => {
    if (
      submittedQuery &&
      total > 0 &&
      !isLoading &&
      lastTrackedQuery.current !== submittedQuery
    ) {
      lastTrackedQuery.current = submittedQuery;
      addToHistory(submittedQuery, total);
    }
  }, [submittedQuery, total, isLoading, addToHistory]);

  const handleSearch = useCallback((query: string) => {
    // Ensure query is a string (fix [object] bug)
    const queryStr = typeof query === "string" ? query : String(query);
    const trimmed = queryStr.trim();
    if (trimmed.length > 0) {
      setSubmittedQuery(trimmed);
    }
  }, []);

  const handleSaveToFavorites = useCallback(async () => {
    if (submittedQuery) {
      await addFavorite(submittedQuery, submittedQuery);
    }
  }, [submittedQuery, addFavorite]);

  // Generate autocomplete suggestions based on current query
  const suggestions = useMemo(() => {
    // Only show suggestions when typing but haven't submitted yet, and autocomplete is enabled
    if (submittedQuery || !searchQuery || !showAutocomplete) {
      return [];
    }
    return getQuerySuggestions(searchQuery);
  }, [searchQuery, submittedQuery, showAutocomplete]);

  // Show suggestions UI
  const showSuggestions =
    !submittedQuery &&
    searchQuery.length > 0 &&
    suggestions.length > 0 &&
    showAutocomplete;
  const showQuickFilters =
    !submittedQuery && searchQuery.length === 0 && showAutocomplete;

  // Check if user modified the query after a search
  const hasModifiedQuery =
    submittedQuery && searchQuery !== submittedQuery && searchQuery.length > 0;

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Type to search or use filters (press Cmd+Enter to search as-is)..."
      searchText={searchQuery}
      onSearchTextChange={setSearchQuery}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Settings"
          value={showAutocomplete ? "autocomplete-on" : "autocomplete-off"}
          onChange={(value) => {
            if (value === "autocomplete-on") {
              setShowAutocomplete(true);
            } else if (value === "autocomplete-off") {
              setShowAutocomplete(false);
            }
          }}
        >
          <List.Dropdown.Section title="Autocomplete">
            <List.Dropdown.Item
              title="✓ Suggestions Enabled"
              value="autocomplete-on"
              icon={Icon.CheckCircle}
            />
            <List.Dropdown.Item
              title="Suggestions Disabled"
              value="autocomplete-off"
              icon={Icon.Circle}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="Info">
            <List.Dropdown.Item
              title={`Credits: ${formatCredits(queryCredits)}`}
              value="credits"
              icon={Icon.Coins}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {/* Quick Filters - shown when no query typed */}
      {showQuickFilters && (
        <List.Section title="Quick Filters" subtitle="Common search templates">
          {QUICK_FILTERS.map((filter) => (
            <List.Item
              key={filter.query}
              title={filter.title}
              subtitle={filter.subtitle}
              icon={{ source: Icon.Stars, tintColor: Color.Purple }}
              accessories={[{ text: filter.query }]}
              actions={
                <ActionPanel>
                  <Action
                    title="Use This Filter"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => {
                      setSearchQuery(filter.query);
                      handleSearch(filter.query);
                    }}
                  />
                  <Action
                    title="Edit Filter"
                    icon={Icon.Pencil}
                    onAction={() => setSearchQuery(filter.query)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Autocomplete Suggestions - shown while typing */}
      {showSuggestions && (
        <List.Section
          title="Suggestions"
          subtitle="Select a suggestion or press Cmd+Enter to search as typed"
        >
          {/* First item: Search as typed */}
          <List.Item
            key="search-as-typed"
            title={`Search: "${searchQuery}"`}
            subtitle="Search with exact text you typed (Cmd+Enter)"
            icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Orange }}
            actions={
              <ActionPanel>
                <Action
                  title="Search as Typed"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => handleSearch(searchQuery)}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
              </ActionPanel>
            }
          />

          {/* Suggestions */}
          {suggestions.map((suggestion, index) => (
            <List.Item
              key={`${suggestion.value}-${index}`}
              title={suggestion.title}
              subtitle={suggestion.subtitle}
              icon={{
                source: suggestion.type === "filter" ? Icon.Tag : Icon.Text,
                tintColor:
                  suggestion.type === "filter" ? Color.Blue : Color.Green,
              }}
              actions={
                <ActionPanel>
                  <Action
                    title="Apply and Search"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => {
                      setSearchQuery(suggestion.value);
                      handleSearch(suggestion.value);
                    }}
                  />
                  <Action
                    title="Apply to Query"
                    icon={Icon.Pencil}
                    onAction={() => setSearchQuery(suggestion.value)}
                  />
                  <Action
                    title="Search Current Query As-Is"
                    icon={Icon.ArrowRight}
                    onAction={() => handleSearch(searchQuery)}
                    shortcut={{ modifiers: ["cmd"], key: "return" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Manual search when autocomplete is disabled */}
      {!submittedQuery && !showAutocomplete && searchQuery.length > 0 && (
        <List.Item
          title={`Search: "${searchQuery}"`}
          subtitle="Press Enter to search"
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Blue }}
          actions={
            <ActionPanel>
              <Action
                title="Search"
                icon={Icon.MagnifyingGlass}
                onAction={() => handleSearch(searchQuery)}
              />
              <Action
                title="Enable Autocomplete"
                icon={Icon.Stars}
                onAction={() => setShowAutocomplete(true)}
              />
            </ActionPanel>
          }
        />
      )}

      {/* Modified query indicator - shown when user edits search after results */}
      {hasModifiedQuery && (
        <List.Section title="New Search">
          <List.Item
            title={`🔍 Search: "${searchQuery}"`}
            subtitle="Press Enter or Cmd+Enter to search with new query"
            icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Orange }}
            actions={
              <ActionPanel>
                <Action
                  title="Search New Query"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => handleSearch(searchQuery)}
                  shortcut={{ modifiers: ["cmd"], key: "return" }}
                />
                <Action
                  title="Restore Previous Search"
                  icon={Icon.ArrowClockwise}
                  onAction={() => setSearchQuery(submittedQuery)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Empty state when no query and no suggestions */}
      {!submittedQuery &&
        !showQuickFilters &&
        !showSuggestions &&
        searchQuery.length === 0 &&
        EmptyStates.SearchToStart()}

      {/* No results state */}
      {submittedQuery &&
        results.length === 0 &&
        !isLoading &&
        EmptyStates.NoSearchResults(submittedQuery)}

      {results.length > 0 && (
        <List.Section
          title={`Results for "${submittedQuery}"`}
          subtitle={`${total.toLocaleString()} total matches`}
        >
          {results.map((result, index) => {
            const vulnCount = result.vulns
              ? Object.keys(result.vulns).length
              : 0;
            const subtitle = [
              result.product &&
                `${result.product}${result.version ? ` ${result.version}` : ""}`,
              result.org,
            ]
              .filter(Boolean)
              .join(" | ");

            return (
              <List.Item
                key={`${result.ip_str}-${result.port}-${index}`}
                title={result.ip_str}
                subtitle={truncateString(subtitle, 50)}
                icon={{ source: Icon.Globe, tintColor: Color.Blue }}
                accessories={[
                  {
                    tag: {
                      value: `${result.port}`,
                      color: getPortColor(result.port),
                    },
                    tooltip: getServiceNameForPort(result.port),
                  },
                  vulnCount > 0
                    ? {
                        tag: {
                          value: `${vulnCount} CVE${vulnCount > 1 ? "s" : ""}`,
                          color: Color.Red,
                        },
                        tooltip: "Known vulnerabilities",
                      }
                    : null,
                  {
                    text: `${result.location.city || "Unknown"}, ${result.location.country_code}`,
                    tooltip: result.location.country_name,
                  },
                ].filter((a): a is NonNullable<typeof a> => a !== null)}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="View">
                      <Action
                        title="View Details"
                        icon={Icon.Eye}
                        onAction={() =>
                          push(
                            <HostDetailView
                              ip={result.ip_str}
                              searchMatch={result}
                            />,
                          )
                        }
                      />
                      <Action.OpenInBrowser
                        title="Open in Shodan"
                        url={`https://www.shodan.io/host/${result.ip_str}`}
                        shortcut={{ modifiers: ["cmd"], key: "o" }}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Copy">
                      <Action.CopyToClipboard
                        title="Copy IP Address"
                        content={result.ip_str}
                        shortcut={{ modifiers: ["cmd"], key: "c" }}
                      />
                      <Action
                        title="Copy Result as JSON"
                        icon={Icon.Clipboard}
                        onAction={() =>
                          copyAsJSON(result, `Host ${result.ip_str}`)
                        }
                        shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                      />
                    </ActionPanel.Section>

                    {hasModifiedQuery && (
                      <ActionPanel.Section title="New Search">
                        <Action
                          title={`Search: "${searchQuery}"`}
                          icon={Icon.MagnifyingGlass}
                          onAction={() => handleSearch(searchQuery)}
                          shortcut={{ modifiers: ["cmd"], key: "return" }}
                        />
                      </ActionPanel.Section>
                    )}

                    <ActionPanel.Section title="Save">
                      <Action
                        title="Save Query to Favorites"
                        icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                        onAction={handleSaveToFavorites}
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                      />
                    </ActionPanel.Section>

                    <ActionPanel.Section title="Export All">
                      <Action
                        title="Copy All Results as JSON"
                        icon={Icon.Download}
                        onAction={() => copyAsJSON(results, "All results")}
                      />
                      <Action
                        title="Copy All Results as Csv"
                        icon={Icon.Download}
                        onAction={() => copyAsCSV(results)}
                      />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
