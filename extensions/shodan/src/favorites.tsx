import { useState, useMemo, useEffect, useRef } from "react";
import {
  List,
  ActionPanel,
  Action,
  Icon,
  Form,
  useNavigation,
  Alert,
  confirmAlert,
  Color,
} from "@raycast/api";
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
import { FavoriteQuery, ShodanSearchMatch } from "./api/types";

function FavoriteResultsView({
  favorite,
  onBack,
}: {
  favorite: FavoriteQuery;
  onBack: () => void;
}) {
  const { push } = useNavigation();
  const { recordUsage } = useFavorites();
  const [filterQuery, setFilterQuery] = useState("");
  const hasRecordedUsage = useRef(false);

  const { results, total, isLoading } = useShodanSearch({
    query: favorite.query,
    enabled: true,
  });

  // Record usage when component mounts (only once)
  useEffect(() => {
    if (!hasRecordedUsage.current) {
      hasRecordedUsage.current = true;
      recordUsage(favorite.id);
    }
  }, [favorite.id, recordUsage]);

  // Apply client-side filtering
  const filteredResults = useMemo(() => {
    return filterResults(results, filterQuery);
  }, [results, filterQuery]);

  const isFiltering = filterQuery.trim().length > 0;
  const displayResults = isFiltering ? filteredResults : results;

  return (
    <List
      isLoading={isLoading}
      navigationTitle={favorite.name}
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
              : `No results for "${favorite.query}".`
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
          title={`Results for "${favorite.name}"`}
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

export default function FavoritesCommand() {
  const { favorites, removeFavorite, renameFavorite } = useFavorites();
  const [selectedFavorite, setSelectedFavorite] =
    useState<FavoriteQuery | null>(null);
  const { push, pop } = useNavigation();

  if (selectedFavorite) {
    return (
      <FavoriteResultsView
        favorite={selectedFavorite}
        onBack={() => setSelectedFavorite(null)}
      />
    );
  }

  if (favorites.length === 0) {
    return (
      <List>
        <List.EmptyView
          title="No Favorite Queries"
          description="Save queries from the Search command to see them here."
          icon={{ source: Icon.Star, tintColor: Color.Yellow }}
        />
      </List>
    );
  }

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirmAlert({
      title: "Delete Favorite",
      message: `Are you sure you want to delete "${name}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      await removeFavorite(id);
    }
  };

  const handleRename = async (id: string, currentName: string) => {
    push(
      <Form
        navigationTitle="Rename Favorite"
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Rename"
              onSubmit={async (values) => {
                await renameFavorite(id, values.name);
                pop();
              }}
            />
          </ActionPanel>
        }
      >
        <Form.TextField id="name" title="New Name" defaultValue={currentName} />
      </Form>,
    );
  };

  // Sort by last used, then by use count
  const sortedFavorites = [...favorites].sort((a, b) => {
    if (a.lastUsed && b.lastUsed) {
      return new Date(b.lastUsed).getTime() - new Date(a.lastUsed).getTime();
    }
    if (a.lastUsed) return -1;
    if (b.lastUsed) return 1;
    return b.useCount - a.useCount;
  });

  return (
    <List searchBarPlaceholder="Search favorites...">
      <List.Section
        title="Favorite Queries"
        subtitle={`${favorites.length} saved`}
      >
        {sortedFavorites.map((favorite) => (
          <List.Item
            key={favorite.id}
            title={favorite.name}
            subtitle={favorite.query}
            icon={{ source: Icon.Star, tintColor: Color.Yellow }}
            accessories={[
              favorite.useCount > 0
                ? { text: `${favorite.useCount} uses`, tooltip: "Times used" }
                : null,
              favorite.lastUsed
                ? {
                    text: formatTimestamp(favorite.lastUsed),
                    tooltip: "Last used",
                  }
                : null,
            ].filter((a): a is NonNullable<typeof a> => a !== null)}
            actions={
              <ActionPanel>
                <ActionPanel.Section title="Run">
                  <Action
                    title="Run Query"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => setSelectedFavorite(favorite)}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Copy">
                  <Action.CopyToClipboard
                    title="Copy Query"
                    content={favorite.query}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel.Section>

                <ActionPanel.Section title="Manage">
                  <Action
                    title="Rename"
                    icon={Icon.Pencil}
                    onAction={() => handleRename(favorite.id, favorite.name)}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Delete"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleDelete(favorite.id, favorite.name)}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
