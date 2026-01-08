import { useState, useCallback } from "react";
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
import { HostDetailView } from "./components/HostDetailView";
import {
  getPortColor,
  getServiceNameForPort,
  truncateString,
  formatCredits,
} from "./utils/formatters";
import { copyAsCSV, copyAsJSON } from "./utils/export";

export default function SearchCommand() {
  const [searchQuery, setSearchQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const { push } = useNavigation();
  const { addFavorite } = useFavorites();
  const { queryCredits } = useApiCredits();

  const { results, total, isLoading } = useShodanSearch({
    query: submittedQuery,
    enabled: submittedQuery.length > 0,
  });

  const handleSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (trimmed.length > 0) {
      setSubmittedQuery(trimmed);
    }
  }, []);

  const handleSaveToFavorites = useCallback(async () => {
    if (submittedQuery) {
      await addFavorite(submittedQuery, submittedQuery);
    }
  }, [submittedQuery, addFavorite]);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Enter Shodan search query (e.g., apache country:US)..."
      searchText={searchQuery}
      onSearchTextChange={setSearchQuery}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Quick Actions"
          onChange={(value) => {
            if (value === "search") {
              handleSearch(searchQuery);
            }
          }}
        >
          <List.Dropdown.Item
            title={`Credits: ${formatCredits(queryCredits)}`}
            value="credits"
          />
          <List.Dropdown.Item title="Press Enter to Search" value="search" />
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="Search"
            icon={Icon.MagnifyingGlass}
            onAction={() => handleSearch(searchQuery)}
          />
        </ActionPanel>
      }
    >
      {!submittedQuery && (
        <List.EmptyView
          title="Search Shodan"
          description="Enter a search query and press Enter to search. Examples: 'apache', 'port:22', 'country:US'"
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action
                title="Search"
                icon={Icon.MagnifyingGlass}
                onAction={() => handleSearch(searchQuery)}
              />
            </ActionPanel>
          }
        />
      )}

      {submittedQuery && results.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Results Found"
          description={`No results for "${submittedQuery}". Try a different query.`}
          icon={Icon.XMarkCircle}
        />
      )}

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
