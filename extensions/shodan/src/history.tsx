import { useState, useMemo } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  Alert,
  confirmAlert,
  Color,
} from "@raycast/api";
import { useQueryHistory } from "./hooks/useQueryHistory";
import { useFavorites } from "./hooks/useFavorites";
import { useShodanSearch } from "./hooks/useShodanSearch";
import { HostDetailView } from "./components/HostDetailView";
import {
  getPortColor,
  getServiceNameForPort,
  truncateString,
  formatTimestamp,
} from "./utils/formatters";
import { copyAsJSON, copyAsCSV } from "./utils/export";
import { filterResults } from "./utils/filter";
import { RecentSearch, ShodanSearchMatch } from "./api/types";

function HistoryResultsView({
  entry,
  onBack,
}: {
  entry: RecentSearch;
  onBack: () => void;
}) {
  const { push } = useNavigation();
  const [filterQuery, setFilterQuery] = useState("");

  const { results, total, isLoading } = useShodanSearch({
    query: entry.query,
    enabled: true,
  });

  // Apply client-side filtering
  const filteredResults = useMemo(() => {
    return filterResults(results, filterQuery);
  }, [results, filterQuery]);

  const isFiltering = filterQuery.trim().length > 0;
  const displayResults = isFiltering ? filteredResults : results;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={entry.query}
      searchBarPlaceholder="Filter results (e.g., country:us, port:443)..."
      onSearchTextChange={setFilterQuery}
      filtering={false}
    >
      {displayResults.length === 0 && !isLoading && (
        <List.EmptyView
          title={isFiltering ? "No Matching Results" : "No Results Found"}
          description={
            isFiltering
              ? `No results match "${filterQuery}". Try a different filter.`
              : `No results for "${entry.query}".`
          }
          icon={Icon.XMarkCircle}
          actions={
            <ActionPanel>
              <Action title="Go Back" icon={Icon.ArrowLeft} onAction={onBack} />
            </ActionPanel>
          }
        />
      )}

      {displayResults.length > 0 && (
        <List.Section
          title={`Results for "${entry.query}"`}
          subtitle={
            isFiltering
              ? `${filteredResults.length} of ${total.toLocaleString()} matches`
              : `${total.toLocaleString()} total matches`
          }
        >
          {displayResults.map((result: ShodanSearchMatch, index: number) => {
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
                      }
                    : null,
                  {
                    text: `${result.location.city || "Unknown"}, ${result.location.country_code}`,
                  },
                ].filter((a): a is NonNullable<typeof a> => a !== null)}
                actions={
                  <ActionPanel>
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
                    <Action.CopyToClipboard
                      title="Copy IP"
                      content={result.ip_str}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                    <Action
                      title="Copy as JSON"
                      icon={Icon.Clipboard}
                      onAction={() =>
                        copyAsJSON(result, `Host ${result.ip_str}`)
                      }
                    />
                    <Action
                      title="Go Back"
                      icon={Icon.ArrowLeft}
                      onAction={onBack}
                    />
                    <Action
                      title="Export All as JSON"
                      icon={Icon.Download}
                      onAction={() => copyAsJSON(displayResults, "All results")}
                    />
                    <Action
                      title="Export All as Csv"
                      icon={Icon.Download}
                      onAction={() => copyAsCSV(displayResults)}
                    />
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

export default function HistoryCommand() {
  const { history, removeFromHistory, clearHistory } = useQueryHistory();
  const { addFavorite, favorites } = useFavorites();
  const [selectedEntry, setSelectedEntry] = useState<RecentSearch | null>(null);

  if (selectedEntry) {
    return (
      <HistoryResultsView
        entry={selectedEntry}
        onBack={() => setSelectedEntry(null)}
      />
    );
  }

  if (history.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Search History"
          description="Your search queries will appear here after you search."
          icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
        />
      </List>
    );
  }

  const handleDelete = async (id: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Entry",
      message: "Are you sure you want to remove this from history?",
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await removeFromHistory(id);
    }
  };

  const handleClearAll = async () => {
    const confirmed = await confirmAlert({
      title: "Clear All History",
      message: "Are you sure you want to clear all search history?",
      primaryAction: {
        title: "Clear All",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await clearHistory();
    }
  };

  const handleSaveToFavorites = async (query: string) => {
    // Check if already in favorites
    if (favorites.some((f) => f.query === query)) {
      return; // useFavorites will show the toast
    }
    await addFavorite(query, query);
  };

  return (
    <List searchBarPlaceholder="Search history...">
      <List.Section
        title="Recent Searches"
        subtitle={`${history.length} entries`}
      >
        {history.map((entry) => {
          const isInFavorites = favorites.some((f) => f.query === entry.query);

          return (
            <List.Item
              key={entry.id}
              title={entry.query}
              icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
              accessories={[
                isInFavorites
                  ? {
                      icon: { source: Icon.Star, tintColor: Color.Yellow },
                      tooltip: "Saved to favorites",
                    }
                  : null,
                {
                  text: `${entry.resultCount.toLocaleString()} results`,
                  tooltip: "Results count",
                },
                {
                  text: formatTimestamp(entry.timestamp),
                  tooltip: "Search time",
                },
              ].filter((a): a is NonNullable<typeof a> => a !== null)}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Run">
                    <Action
                      title="Re-Run Query"
                      icon={Icon.MagnifyingGlass}
                      onAction={() => setSelectedEntry(entry)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Copy">
                    <Action.CopyToClipboard
                      title="Copy Query"
                      content={entry.query}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Save">
                    {!isInFavorites && (
                      <Action
                        title="Save to Favorites"
                        icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                        onAction={() => handleSaveToFavorites(entry.query)}
                        shortcut={{ modifiers: ["cmd"], key: "s" }}
                      />
                    )}
                  </ActionPanel.Section>

                  <ActionPanel.Section title="Manage">
                    <Action
                      title="Delete from History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDelete(entry.id)}
                      shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                    />
                    <Action
                      title="Clear All History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={handleClearAll}
                      shortcut={{
                        modifiers: ["cmd", "shift"],
                        key: "backspace",
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}
