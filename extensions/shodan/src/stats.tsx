import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  LocalStorage,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { ShodanAPI, ShodanStatsResult } from "./shodan-api";

// Search history interface
interface SearchHistoryItem {
  query: string;
  timestamp: number;
  totalResults?: number;
}

// Common search filters for quick access
const COMMON_FILTERS = [
  { name: "Webcams with Screenshots", query: "webcam has_screenshot:true", icon: Icon.Camera },
  { name: "SSH Servers", query: "port:22", icon: Icon.Terminal },
  { name: "HTTP Servers", query: "port:80", icon: Icon.Globe },
  { name: "HTTPS Servers", query: "port:443", icon: Icon.Lock },
  { name: "FTP Servers", query: "port:21", icon: Icon.Folder },
  { name: "Telnet Servers", query: "port:23", icon: Icon.Terminal },
  { name: "MySQL Databases", query: "port:3306", icon: Icon.Gear },
  { name: "PostgreSQL Databases", query: "port:5432", icon: Icon.Gear },
  { name: "MongoDB", query: "port:27017", icon: Icon.Gear },
  { name: "Redis", query: "port:6379", icon: Icon.MemoryChip },
  { name: "VNC Servers", query: "port:5900", icon: Icon.Desktop },
  { name: "RDP Servers", query: "port:3389", icon: Icon.Desktop },
  { name: "Printers", query: "printer", icon: Icon.Print },
  { name: "Cameras", query: "camera", icon: Icon.Camera },
  { name: "Routers", query: "router", icon: Icon.Network },
  { name: "IoT Devices", query: "iot", icon: Icon.Gear },
];

export default function Stats() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statsResult, setStatsResult] = useState<ShodanStatsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const shodanAPI = new ShodanAPI();

  // Load search history on component mount
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await LocalStorage.getItem<string>("statsHistory");
      if (history) {
        const parsedHistory = JSON.parse(history) as SearchHistoryItem[];
        setSearchHistory(parsedHistory);
      }
    } catch (error) {
      console.error("Failed to load search history:", error);
    }
  };

  const saveSearchHistory = async (newItem: SearchHistoryItem) => {
    try {
      const updatedHistory = [newItem, ...searchHistory.filter((item) => item.query !== newItem.query)].slice(0, 20);
      setSearchHistory(updatedHistory);
      await LocalStorage.setItem("statsHistory", JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  };

  const clearSearchHistory = async () => {
    try {
      setSearchHistory([]);
      await LocalStorage.removeItem("statsHistory");
      showToast({ title: "Search history cleared", style: Toast.Style.Success });
    } catch (error) {
      console.error("Failed to clear search history:", error);
      showToast({ title: "Failed to clear history", style: Toast.Style.Failure });
    }
  };

  const handleStatsSearch = async (query: string) => {
    if (!query.trim()) {
      setStatsResult(null);
      setError(null);
      return;
    }

    console.log("📊 Starting stats search for:", query);
    setIsLoading(true);
    setError(null);

    try {
      const result = await shodanAPI.getStats(query);
      console.log("📊 Stats result:", result);

      setStatsResult(result);

      if (result.total === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "No results found",
          message: `No results found for "${query}"`,
        });
      } else {
        console.log("✅ Stats search completed successfully");
        console.log("📊 Total results:", result.total);

        // Save to search history
        const historyItem: SearchHistoryItem = {
          query,
          timestamp: Date.now(),
          totalResults: result.total,
        };
        await saveSearchHistory(historyItem);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("❌ Stats search error:", errorMessage);
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Stats search failed",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchText.trim()) {
        handleStatsSearch(searchText);
      } else {
        setStatsResult(null);
        setError(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  const renderFacetResults = (facetName: string, facetData: Array<{ count: number; value: string }>) => {
    return (
      <List.Section key={facetName} title={`Top 10 Results for Facet: ${facetName}`}>
        {facetData.slice(0, 10).map((item, index) => (
          <List.Item
            key={`${facetName}-${item.value}-${index}`}
            title={item.value}
            subtitle={`${item.count.toLocaleString()} results`}
            icon={facetName === "country" ? Icon.Globe : Icon.Building}
            actions={
              <ActionPanel>
                <Action
                  title="View Results for This Value"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => {
                    const newQuery = `${searchText} ${facetName}:${item.value}`;
                    launchCommand({
                      name: "search-criteria",
                      type: LaunchType.UserInitiated,
                      arguments: { query: newQuery },
                    });
                  }}
                />
                <Action
                  title="Get Stats for This Value"
                  icon={Icon.BarChart}
                  onAction={() => {
                    const newQuery = `${searchText} ${facetName}:${item.value}`;
                    setSearchText(newQuery);
                    handleStatsSearch(newQuery);
                  }}
                />
                <Action.CopyToClipboard title="Copy Value" content={item.value} />
                <Action.CopyToClipboard title="Copy Count" content={item.count.toString()} />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter search criteria for stats (e.g., 'webcam has_screenshot:true')..."
      throttle
    >
      {error && (
        <List.Item title="Error" subtitle={error} icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }} />
      )}

      {!isLoading && !error && !statsResult && searchText && (
        <List.Item
          title="No results found"
          subtitle="Try a different search query or check your search criteria"
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
        />
      )}

      {!searchText && (
        <>
          <List.Item
            title="Enter search criteria for stats"
            subtitle="Get statistics about search results including country and organization breakdowns"
            icon={{ source: Icon.BarChart, tintColor: Color.SecondaryText }}
          />

          <List.Section title="Common Search Filters">
            {COMMON_FILTERS.map((filter) => (
              <List.Item
                key={filter.name}
                title={filter.name}
                subtitle={filter.query}
                icon={filter.icon}
                actions={
                  <ActionPanel>
                    <Action
                      title="Get Stats for This Filter"
                      icon={Icon.BarChart}
                      onAction={() => {
                        setSearchText(filter.query);
                        handleStatsSearch(filter.query);
                      }}
                    />
                    <Action
                      title="View Results for This Filter"
                      icon={Icon.MagnifyingGlass}
                      onAction={() => {
                        launchCommand({
                          name: "search-criteria",
                          type: LaunchType.UserInitiated,
                          arguments: { query: filter.query },
                        });
                      }}
                    />
                    <Action.CopyToClipboard title="Copy Query" content={filter.query} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          {searchHistory.length > 0 && (
            <List.Section title="Recent Stats Searches">
              {searchHistory.map((item) => (
                <List.Item
                  key={`${item.query}-${item.timestamp}`}
                  title={item.query}
                  subtitle={`${item.totalResults || 0} results • ${new Date(item.timestamp).toLocaleDateString()}`}
                  icon={Icon.Clock}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Get Stats Again"
                        icon={Icon.BarChart}
                        onAction={() => {
                          setSearchText(item.query);
                          handleStatsSearch(item.query);
                        }}
                      />
                      <Action
                        title="View Results"
                        icon={Icon.MagnifyingGlass}
                        onAction={() => {
                          launchCommand({
                            name: "search-criteria",
                            type: LaunchType.UserInitiated,
                            arguments: { query: item.query },
                          });
                        }}
                      />
                      <Action.CopyToClipboard title="Copy Query" content={item.query} />
                    </ActionPanel>
                  }
                />
              ))}
              <List.Item
                title="Clear History"
                subtitle={`${searchHistory.length} searches`}
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                actions={
                  <ActionPanel>
                    <Action
                      title="Clear All History"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={clearSearchHistory}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      )}

      {statsResult && (
        <>
          <List.Section title="Search Statistics">
            <List.Item
              title="Total Results"
              subtitle={`${statsResult.total.toLocaleString()} results found`}
              icon={Icon.BarChart}
              actions={
                <ActionPanel>
                  <Action
                    title="View Results"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => {
                      launchCommand({
                        name: "search-criteria",
                        type: LaunchType.UserInitiated,
                        arguments: { query: searchText },
                      });
                    }}
                  />
                  <Action.CopyToClipboard title="Copy Total Count" content={statsResult.total.toString()} />
                </ActionPanel>
              }
            />
          </List.Section>

          {Object.entries(statsResult.facets).map(([facetName, facetData]) => renderFacetResults(facetName, facetData))}
        </>
      )}
    </List>
  );
}
