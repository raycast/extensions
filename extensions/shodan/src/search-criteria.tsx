import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  open,
  LocalStorage,
  LaunchProps,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { ShodanAPI, ShodanSearchHostInfo } from "./shodan-api";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// Search history interface
interface SearchHistoryItem {
  query: string;
  timestamp: number;
  resultCount?: number;
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

// Helper function to format search result for display
const formatSearchResult = (result: ShodanSearchHostInfo): string => {
  return result.ip_str;
};

// Helper function to get result subtitle
const getResultSubtitle = (result: ShodanSearchHostInfo): string => {
  return result.port ? `:${result.port}` : "";
};

// Helper function to save base64 screenshot to temporary file (full size)
const saveScreenshotToTempFile = (base64Data: string): string | null => {
  try {
    const tempDir = os.tmpdir();
    const imageFileName = `shodan_screenshot_full_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.png`;
    const imagePath = path.join(tempDir, imageFileName);

    // Remove the data URL prefix if present
    const cleanBase64Data = base64Data.replace(/^data:image\/\w+;base64,/, "");

    // Write the image file
    fs.writeFileSync(imagePath, cleanBase64Data, { encoding: "base64" });

    return imagePath;
  } catch (error) {
    console.error("Error saving screenshot to temp file:", error);
    return null;
  }
};

interface SearchCriteriaArguments {
  query?: string;
}

export default function SearchCriteria(props: LaunchProps<{ arguments: SearchCriteriaArguments }>) {
  const [searchText, setSearchText] = useState(props.arguments.query || "");
  const [isLoading, setIsLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<ShodanSearchHostInfo[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const shodanAPI = new ShodanAPI();

  // Load search history on component mount
  useEffect(() => {
    loadSearchHistory();
  }, []);

  // Trigger search if launched with arguments
  useEffect(() => {
    if (props.arguments.query) {
      handleSearch(props.arguments.query, 1);
    }
  }, [props.arguments.query]);

  const loadSearchHistory = async () => {
    try {
      const history = await LocalStorage.getItem<string>("searchCriteriaHistory");
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
      await LocalStorage.setItem("searchCriteriaHistory", JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  };

  const clearSearchHistory = async () => {
    try {
      setSearchHistory([]);
      await LocalStorage.removeItem("searchCriteriaHistory");
      showToast({ title: "Search history cleared", style: Toast.Style.Success });
    } catch (error) {
      console.error("Failed to clear search history:", error);
      showToast({ title: "Failed to clear history", style: Toast.Style.Failure });
    }
  };

  const handleSearch = async (query: string, page = 1) => {
    if (!query.trim()) {
      setSearchResults([]);
      setError(null);
      setTotalResults(0);
      setCurrentPage(1);
      return;
    }

    console.log("🔍 Starting search for:", query, "page:", page);
    setIsLoading(true);
    setError(null);

    try {
      const result = await shodanAPI.searchWithCriteria(query, page);
      console.log("📊 Search result:", result);

      setSearchResults(result.matches as ShodanSearchHostInfo[]);
      setTotalResults(result.total);
      setCurrentPage(page);

      // Check if any results have screenshots
      const hasScreenshotsInResults = result.matches.some((match: ShodanSearchHostInfo) => match.screenshot);

      if (result.matches.length === 0) {
        showToast({
          style: Toast.Style.Failure,
          title: "No results found",
          message: `No results found for "${query}"`,
        });
      } else {
        console.log("✅ Search completed successfully");
        console.log("📊 Total results:", result.total);
        console.log("📊 Current page results:", result.matches.length);
        console.log("📸 Has screenshots:", hasScreenshotsInResults);

        // Save to search history
        const historyItem: SearchHistoryItem = {
          query,
          timestamp: Date.now(),
          resultCount: result.total,
        };
        await saveSearchHistory(historyItem);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("❌ Search error:", errorMessage);
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Search failed",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadNextPage = () => {
    if (searchText && currentPage * 100 < totalResults) {
      handleSearch(searchText, currentPage + 1);
    }
  };

  const loadPreviousPage = () => {
    if (searchText && currentPage > 1) {
      handleSearch(searchText, currentPage - 1);
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchText.trim()) {
        handleSearch(searchText, 1);
      } else {
        setSearchResults([]);
        setError(null);
        setTotalResults(0);
        setCurrentPage(1);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  // Helper function to group results by IP address
  const groupResultsByIP = (results: ShodanSearchHostInfo[]) => {
    const grouped = results.reduce(
      (acc, result) => {
        const ip = result.ip_str;
        if (!acc[ip]) {
          acc[ip] = [];
        }
        acc[ip].push(result);
        return acc;
      },
      {} as Record<string, ShodanSearchHostInfo[]>,
    );

    return Object.entries(grouped).map(([ip, ipResults]) => ({
      ip,
      results: ipResults,
      totalPorts: ipResults.length,
      openPorts: [...new Set(ipResults.map((r) => r.port).filter(Boolean))].sort((a, b) => a - b),
    }));
  };

  // Check if this is a scan result query (contains net: filter)
  // This covers both specific protocol scans and "All Services" scans
  const isScanResult = searchText.includes("net:");

  // Render grouped results for scan queries
  const renderGroupedResults = () => {
    const grouped = groupResultsByIP(searchResults);

    return grouped.map((group) => (
      <List.Section key={group.ip} title={`${group.ip} (${group.totalPorts} ports)`}>
        {group.results.map((result, resultIndex) => (
          <List.Item
            key={`${result.ip_str}-${result.port}-${resultIndex}`}
            title={`Port ${result.port}`}
            subtitle={result.product || result.data || "Unknown service"}
            icon={result.screenshot ? Icon.Camera : Icon.Network}
            detail={
              <List.Item.Detail
                markdown={(() => {
                  let markdown = `## ${group.ip}:${result.port}`;

                  if (result.product) {
                    markdown += ` - ${result.product}`;
                  }

                  markdown += `\n\n`;

                  // Display screenshot with proper sizing using Raycast parameters
                  if (result.screenshot) {
                    const screenshotPath = saveScreenshotToTempFile(result.screenshot.data);
                    if (screenshotPath) {
                      markdown += `![Screenshot](file://${screenshotPath}?raycast-width=200&raycast-height=150)\n\n`;
                    }
                  }

                  if (result.os) {
                    markdown += `**Operating System:** ${result.os}\n\n`;
                  }

                  if (result.product) {
                    markdown += `**Product:** ${result.product}\n\n`;
                  }

                  if (result.version) {
                    markdown += `**Version:** ${result.version}\n\n`;
                  }

                  if (result.data) {
                    markdown += `**Banner:**\n\`\`\`\n${result.data}\n\`\`\`\n\n`;
                  }

                  if (result.vulns && result.vulns.length > 0) {
                    markdown += `**Vulnerabilities:** ${result.vulns.length} found\n\n`;
                  }

                  if (result.tags && result.tags.length > 0) {
                    markdown += `**Tags:** ${result.tags.join(", ")}\n\n`;
                  }

                  return markdown;
                })()}
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label title="IP Address" text={group.ip} />
                    {result.hostnames && result.hostnames.length > 0 && (
                      <List.Item.Detail.Metadata.Label title="Hostnames" text={result.hostnames.join(", ")} />
                    )}
                    <List.Item.Detail.Metadata.Label title="Port" text={result.port?.toString() || "Unknown"} />
                    {result.org && <List.Item.Detail.Metadata.Label title="Organization" text={result.org} />}
                    {result.isp && <List.Item.Detail.Metadata.Label title="ISP" text={result.isp} />}
                    {result.location && (
                      <>
                        <List.Item.Detail.Metadata.Separator />
                        <List.Item.Detail.Metadata.Label title="Country" text={result.location.country_name} />
                        <List.Item.Detail.Metadata.Label title="Region" text={result.location.region_code} />
                        <List.Item.Detail.Metadata.Label title="City" text={result.location.city} />
                      </>
                    )}
                    {result.os && <List.Item.Detail.Metadata.Label title="OS" text={result.os} />}
                    {result.product && <List.Item.Detail.Metadata.Label title="Product" text={result.product} />}
                    {result.version && <List.Item.Detail.Metadata.Label title="Version" text={result.version} />}
                    <List.Item.Detail.Metadata.Label title="Open Ports on IP" text={group.openPorts.join(", ")} />
                    {result.vulns && result.vulns.length > 0 && (
                      <List.Item.Detail.Metadata.Label title="Vulnerabilities" text={result.vulns.length.toString()} />
                    )}
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action
                  title="View IP Details"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => {
                    launchCommand({
                      name: "search-host",
                      type: LaunchType.UserInitiated,
                      arguments: { ip: group.ip },
                    });
                  }}
                />
                <Action
                  title="Request On-Demand Scan"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => {
                    launchCommand({
                      name: "scan-ondemand",
                      type: LaunchType.UserInitiated,
                      arguments: { ips: group.ip },
                    });
                  }}
                />
                <Action.CopyToClipboard title="Copy IP Address" content={group.ip} />
                <Action.CopyToClipboard title="Copy Port" content={result.port?.toString() || ""} />
                <Action
                  title="Open in Shodan"
                  icon={Icon.Globe}
                  onAction={() => {
                    const url = result.port
                      ? `https://www.shodan.io/host/${group.ip}#${result.port}`
                      : `https://www.shodan.io/host/${group.ip}`;
                    open(url);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    ));
  };

  const renderSearchResult = (result: ShodanSearchHostInfo, index: number) => {
    return (
      <List.Item
        key={`${result.ip_str}-${result.port}-${index}`}
        title={formatSearchResult(result)}
        subtitle={getResultSubtitle(result)}
        icon={result.screenshot ? Icon.Camera : Icon.Network}
        detail={
          <List.Item.Detail
            markdown={(() => {
              let markdown = `## ${formatSearchResult(result)}`;

              if (result.port) {
                markdown += `:${result.port}`;
              }

              markdown += `\n\n`;

              // Display screenshot with proper sizing using Raycast parameters
              if (result.screenshot) {
                const screenshotPath = saveScreenshotToTempFile(result.screenshot.data);
                if (screenshotPath) {
                  markdown += `![Screenshot](file://${screenshotPath}?raycast-width=200&raycast-height=150)\n\n`;
                }
              }

              if (result.os) {
                markdown += `**Operating System:** ${result.os}\n\n`;
              }

              if (result.product) {
                markdown += `**Product:** ${result.product}\n\n`;
              }

              if (result.version) {
                markdown += `**Version:** ${result.version}\n\n`;
              }

              if (result.ports && result.ports.length > 0) {
                markdown += `**Open Ports:** ${result.ports.join(", ")}\n\n`;
              }

              if (result.vulns && result.vulns.length > 0) {
                markdown += `**Vulnerabilities:** ${result.vulns.length} found\n\n`;
              }

              if (result.tags && result.tags.length > 0) {
                markdown += `**Tags:** ${result.tags.join(", ")}\n\n`;
              }

              return markdown;
            })()}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="IP Address" text={result.ip_str} />
                {result.hostnames && result.hostnames.length > 0 && (
                  <List.Item.Detail.Metadata.Label title="Hostnames" text={result.hostnames.join(", ")} />
                )}
                {result.port && <List.Item.Detail.Metadata.Label title="Port" text={result.port.toString()} />}
                {result.org && <List.Item.Detail.Metadata.Label title="Organization" text={result.org} />}
                {result.isp && <List.Item.Detail.Metadata.Label title="ISP" text={result.isp} />}
                {result.location && (
                  <>
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label title="Country" text={result.location.country_name} />
                    <List.Item.Detail.Metadata.Label title="Region" text={result.location.region_code} />
                    <List.Item.Detail.Metadata.Label title="City" text={result.location.city} />
                  </>
                )}
                {result.os && <List.Item.Detail.Metadata.Label title="OS" text={result.os} />}
                {result.product && <List.Item.Detail.Metadata.Label title="Product" text={result.product} />}
                {result.version && <List.Item.Detail.Metadata.Label title="Version" text={result.version} />}
                {result.ports && result.ports.length > 0 && (
                  <List.Item.Detail.Metadata.Label title="Open Ports" text={result.ports.length.toString()} />
                )}
                {result.vulns && result.vulns.length > 0 && (
                  <List.Item.Detail.Metadata.Label title="Vulnerabilities" text={result.vulns.length.toString()} />
                )}
                {result.screenshot && <List.Item.Detail.Metadata.Label title="Screenshot" text="Available" />}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <Action.CopyToClipboard title="Copy IP Address" content={result.ip_str} />
            <Action
              title="Open in Shodan"
              icon={Icon.Globe}
              onAction={() => {
                const url = result.port
                  ? `https://www.shodan.io/host/${result.ip_str}#${result.port}`
                  : `https://www.shodan.io/host/${result.ip_str}`;
                open(url);
              }}
            />
            <Action
              title="Request On-Demand Scan"
              icon={Icon.MagnifyingGlass}
              shortcut={{ modifiers: ["cmd"], key: "d" }}
              onAction={() => {
                launchCommand({
                  name: "scan-ondemand",
                  type: LaunchType.UserInitiated,
                  arguments: { ips: result.ip_str },
                });
              }}
            />
            {result.screenshot && (
              <Action
                title="View Full Screenshot"
                icon={Icon.Camera}
                shortcut={{ modifiers: ["cmd"], key: "s" }}
                onAction={() => {
                  // Save screenshot to temp file and open it
                  const screenshotPath = saveScreenshotToTempFile(result.screenshot!.data);
                  if (screenshotPath) {
                    open(screenshotPath);
                  } else {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Error",
                      message: "Failed to save screenshot",
                    });
                  }
                }}
              />
            )}
            {result.port && <Action.CopyToClipboard title="Copy Port" content={result.port.toString()} />}
            {result.hostnames && result.hostnames.length > 0 && (
              <Action.CopyToClipboard title="Copy Hostname" content={result.hostnames[0]} />
            )}
            {result.screenshot && (
              <Action.CopyToClipboard
                title="Copy Screenshot Data URL"
                content={`data:image/png;base64,${result.screenshot.data}`}
              />
            )}
          </ActionPanel>
        }
      />
    );
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter search criteria (e.g., 'webcam has_screenshot:true')..."
      throttle
      isShowingDetail={true}
    >
      {error && (
        <List.Item title="Error" subtitle={error} icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }} />
      )}

      {!isLoading && !error && searchResults.length === 0 && searchText && (
        <List.Item
          title="No results found"
          subtitle="Try a different search query or check your search criteria"
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
        />
      )}

      {!searchText && (
        <>
          <List.Item
            title="Enter search criteria"
            subtitle="Use Shodan search filters to find specific devices and services"
            icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
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
                      title="Search with This Filter"
                      icon={Icon.MagnifyingGlass}
                      onAction={() => {
                        setSearchText(filter.query);
                        handleSearch(filter.query, 1);
                      }}
                    />
                    <Action.CopyToClipboard title="Copy Query" content={filter.query} />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          {searchHistory.length > 0 && (
            <List.Section title="Recent Searches">
              {searchHistory.map((item) => (
                <List.Item
                  key={`${item.query}-${item.timestamp}`}
                  title={item.query}
                  subtitle={`${item.resultCount || 0} results • ${new Date(item.timestamp).toLocaleDateString()}`}
                  icon={Icon.Clock}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Search Again"
                        icon={Icon.MagnifyingGlass}
                        onAction={() => {
                          setSearchText(item.query);
                          handleSearch(item.query, 1);
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

      {searchResults.length > 0 && (
        <>
          {isScanResult ? (
            <>
              <List.Section
                title={`Scan Results (${totalResults.toLocaleString()} total)`}
                subtitle={`Page ${currentPage} • ${searchResults.length} results`}
              />
              {renderGroupedResults()}
            </>
          ) : (
            <List.Section
              title={`Search Results (${totalResults.toLocaleString()} total)`}
              subtitle={`Page ${currentPage} • ${searchResults.length} results`}
            >
              {searchResults.map((result, index) => renderSearchResult(result, index))}
            </List.Section>
          )}
        </>
      )}

      {searchResults.length > 0 && (
        <List.Section title="Pagination">
          <List.Item
            title="Previous Page"
            subtitle={currentPage > 1 ? `Go to page ${currentPage - 1}` : "Already on first page"}
            icon={Icon.ChevronLeft}
            actions={
              <ActionPanel>
                {currentPage > 1 && (
                  <Action title="Go to Previous Page" icon={Icon.ChevronLeft} onAction={loadPreviousPage} />
                )}
              </ActionPanel>
            }
          />
          <List.Item
            title="Next Page"
            subtitle={currentPage * 100 < totalResults ? `Go to page ${currentPage + 1}` : "No more pages"}
            icon={Icon.ChevronRight}
            actions={
              <ActionPanel>
                {currentPage * 100 < totalResults && (
                  <Action title="Go to Next Page" icon={Icon.ChevronRight} onAction={loadNextPage} />
                )}
              </ActionPanel>
            }
          />
        </List.Section>
      )}
    </List>
  );
}
