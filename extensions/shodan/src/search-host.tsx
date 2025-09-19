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
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { ShodanAPI, ShodanHostInfo, ShodanPortInfo } from "./shodan-api";

// Search history interface
interface SearchHistoryItem {
  ip: string;
  timestamp: number;
  hostname?: string;
  org?: string;
}

// Helper function to get service name from port number
const getServiceName = (port: number): string => {
  const commonPorts: { [key: number]: string } = {
    20: "FTP Data",
    21: "FTP Control",
    22: "SSH",
    23: "Telnet",
    25: "SMTP",
    53: "DNS",
    80: "HTTP",
    110: "POP3",
    143: "IMAP",
    443: "HTTPS",
    993: "IMAPS",
    995: "POP3S",
    1433: "MSSQL",
    3306: "MySQL",
    3389: "RDP",
    5432: "PostgreSQL",
    5900: "VNC",
    6379: "Redis",
    8080: "HTTP Alt",
    8443: "HTTPS Alt",
    27017: "MongoDB",
    11211: "Memcached",
  };
  return commonPorts[port] || `Port ${port}`;
};

// Helper function to validate IP address
const isValidIPAddress = (input: string): boolean => {
  // IPv4 validation
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

  // IPv6 validation (simplified)
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;

  // Domain name validation (basic)
  const domainRegex =
    /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

  return ipv4Regex.test(input) || ipv6Regex.test(input) || domainRegex.test(input);
};

// Helper function to determine protocol based on port
const getProtocol = (port: number, transport?: string): string => {
  if (transport) {
    return transport.toUpperCase();
  }

  // Common UDP ports
  const udpPorts = [53, 67, 68, 69, 123, 161, 162, 500, 514, 520, 631, 1434, 1900, 5353];

  if (udpPorts.includes(port)) {
    return "UDP";
  }

  // Default to TCP for most ports
  return "TCP";
};

// Helper function to format port metadata for tooltip
const formatPortMetadata = (portData: ShodanPortInfo, port: number): string => {
  const metadata = [];

  metadata.push(`Port: ${port}`);
  metadata.push(`Protocol: ${getProtocol(port, portData.transport)}`);

  if (portData.product) {
    metadata.push(`Service: ${portData.product}`);
  }

  if (portData.version) {
    metadata.push(`Version: ${portData.version}`);
  }

  if (portData.os) {
    metadata.push(`OS: ${portData.os}`);
  }

  if (portData.hostname) {
    metadata.push(`Hostname: ${portData.hostname}`);
  }

  if (portData.timestamp) {
    try {
      const date = new Date(portData.timestamp);
      if (!isNaN(date.getTime())) {
        metadata.push(`Last Seen: ${date.toLocaleString()}`);
      }
    } catch {
      // If timestamp parsing fails, skip it
    }
  }

  if (portData.vulns && portData.vulns.length > 0) {
    metadata.push(`Vulnerabilities: ${portData.vulns.length}`);
  }

  if (portData.cpe && portData.cpe.length > 0) {
    metadata.push(`CPE: ${portData.cpe.length} entries`);
  }

  return metadata.join("\n");
};

export default function SearchHost() {
  const [searchText, setSearchText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hostInfo, setHostInfo] = useState<ShodanHostInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const shodanAPI = new ShodanAPI();

  // Load search history on component mount
  useEffect(() => {
    loadSearchHistory();
  }, []);

  const loadSearchHistory = async () => {
    try {
      const history = await LocalStorage.getItem<string>("searchHistory");
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
      const updatedHistory = [newItem, ...searchHistory.filter((item) => item.ip !== newItem.ip)].slice(0, 20); // Keep last 20 searches
      setSearchHistory(updatedHistory);
      await LocalStorage.setItem("searchHistory", JSON.stringify(updatedHistory));
    } catch (error) {
      console.error("Failed to save search history:", error);
    }
  };

  const clearSearchHistory = async () => {
    try {
      setSearchHistory([]);
      await LocalStorage.removeItem("searchHistory");
      showToast({ title: "Search history cleared", style: Toast.Style.Success });
    } catch (error) {
      console.error("Failed to clear search history:", error);
      showToast({ title: "Failed to clear history", style: Toast.Style.Failure });
    }
  };

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setHostInfo(null);
      setError(null);
      return;
    }

    console.log("🔍 Starting search for:", query);
    setIsLoading(true);
    setError(null);

    try {
      const result = await shodanAPI.searchHost(query);
      console.log("📊 Search result:", result);
      setHostInfo(result);
      if (!result) {
        console.log("❌ No results found for:", query);
        showToast({
          style: Toast.Style.Failure,
          title: "Host not found",
          message: `No information found for ${query}`,
        });
      } else {
        console.log("✅ Host info loaded successfully");
        console.log("📅 Raw timestamp:", result.timestamp);
        console.log("📅 Last update:", result.last_update);
        console.log("🔌 Ports found:", result.ports?.length || 0);
        console.log("📋 Port data (data_array):", result.data_array?.length || 0);
        console.log("📋 Port data (data):", result.data?.length || 0);
        console.log("📋 Data structure:", {
          hasDataArray: !!result.data_array,
          hasData: !!result.data,
          dataKeys: Object.keys(result).filter((key) => key.includes("data")),
        });

        // Save to search history
        const historyItem: SearchHistoryItem = {
          ip: result.ip_str,
          timestamp: Date.now(),
          hostname: result.hostnames?.[0],
          org: result.org,
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

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchText && isValidIPAddress(searchText.trim())) {
        handleSearch(searchText);
      } else if (searchText && !isValidIPAddress(searchText.trim())) {
        // Clear previous results if input is invalid
        setHostInfo(null);
        setError(null);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchText]);

  const renderHostInfo = () => {
    if (!hostInfo) return null;

    const items = [];

    // Basic Information Section with Table-like structure
    items.push(
      <List.Section key="basic" title="Basic Information">
        <List.Item
          title="IP Address"
          subtitle={hostInfo.ip_str}
          accessories={[{ text: "Primary" }]}
          icon={Icon.Globe}
          detail={
            <List.Item.Detail
              markdown={`## IP Address Information\n\n**${hostInfo.ip_str}**\n\nThis IP address has been scanned by Shodan and contains detailed information about open ports, services, and potential security vulnerabilities.`}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="IP Address" text={hostInfo.ip_str} />
                  {hostInfo.hostnames.length > 0 && (
                    <List.Item.Detail.Metadata.Label
                      title="Hostnames"
                      text={`${hostInfo.hostnames.length} hostname${hostInfo.hostnames.length > 1 ? "s" : ""}`}
                    />
                  )}
                  {hostInfo.hostnames.length > 0 && (
                    <List.Item.Detail.Metadata.Label title="Domains" text={hostInfo.hostnames.join(", ")} />
                  )}
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Organization" text={hostInfo.org || "Unknown"} />
                  <List.Item.Detail.Metadata.Label title="ISP" text={hostInfo.isp || "Unknown"} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Last Seen"
                    text={hostInfo.last_update || hostInfo.timestamp || "Unknown"}
                  />
                  <List.Item.Detail.Metadata.Label title="Open Ports" text={`${hostInfo.ports.length} ports`} />
                </List.Item.Detail.Metadata>
              }
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Open in Shodan"
                icon={Icon.Globe}
                onAction={() => {
                  const url = `https://www.shodan.io/host/${hostInfo.ip_str}`;
                  console.log("🌐 Opening Shodan for IP:", hostInfo.ip_str, "URL:", url);
                  open(url);
                }}
              />
              <Action.CopyToClipboard title="Copy IP Address" content={hostInfo.ip_str} />
              <Action
                title="Request On-Demand Scan"
                icon={Icon.MagnifyingGlass}
                shortcut={{ modifiers: ["cmd"], key: "d" }}
                onAction={() => {
                  launchCommand({
                    name: "scan-ondemand",
                    type: LaunchType.UserInitiated,
                    arguments: { ips: hostInfo.ip_str },
                  });
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>,
    );

    // Location Information
    if (hostInfo.location) {
      items.push(
        <List.Section key="location" title="Location">
          <List.Item
            title="Country"
            subtitle={`${hostInfo.location.country_name} (${hostInfo.location.country_code})`}
            icon={Icon.Flag}
          />
          <List.Item title="Region" subtitle={hostInfo.location.region_code} icon={Icon.Map} />
          <List.Item title="City" subtitle={hostInfo.location.city} icon={Icon.Pin} />
          <List.Item
            title="Coordinates"
            subtitle={`${hostInfo.location.latitude}, ${hostInfo.location.longitude}`}
            icon={Icon.Pin}
          />
        </List.Section>,
      );
    }

    // System Information
    if (hostInfo.os || hostInfo.product) {
      items.push(
        <List.Section key="system" title="System Information">
          {hostInfo.os && <List.Item title="Operating System" subtitle={hostInfo.os} icon={Icon.ComputerChip} />}
          {hostInfo.product && <List.Item title="Product" subtitle={hostInfo.product} icon={Icon.Box} />}
          {hostInfo.version && <List.Item title="Version" subtitle={hostInfo.version} icon={Icon.Tag} />}
        </List.Section>,
      );
    }

    // Ports and Services
    if (hostInfo.ports && hostInfo.ports.length > 0) {
      const portDataMap = new Map<number, ShodanPortInfo>();

      // Try data_array first, then fall back to data
      const dataSource = (hostInfo.data_array || hostInfo.data || []) as ShodanPortInfo[];
      console.log("🔍 Using data source:", dataSource.length, "items");

      dataSource.forEach((service: ShodanPortInfo) => {
        console.log("📋 Processing service:", {
          port: service.port,
          hasData: !!service.data,
          dataLength: service.data?.length || 0,
          product: service.product,
          transport: service.transport,
        });
        portDataMap.set(service.port, service);
      });

      const sortedPorts = [...hostInfo.ports].sort((a, b) => a - b);

      items.push(
        <List.Section key="ports" title={`Open Ports & Services (${hostInfo.ports.length})`}>
          {sortedPorts.map((port) => {
            const portData = portDataMap.get(port);
            const serviceName = getServiceName(port);
            const protocol = getProtocol(port, portData?.transport);
            const subtitle = portData?.product || serviceName;
            const accessories = [];

            console.log(`🔌 Rendering port ${port}:`, {
              portData: portData ? "exists" : "null",
              serviceName,
              protocol,
              subtitle,
              hasBanner: !!(portData?.banner || portData?.data),
              bannerLength: (portData?.banner || portData?.data)?.length || 0,
              bannerData: portData?.data?.substring(0, 100) + "..." || "none",
            });

            // Add protocol to accessories
            accessories.push({ text: protocol });

            if (portData?.version) {
              accessories.push({ text: portData.version });
            }
            if (portData?.vulns && portData.vulns.length > 0) {
              accessories.push({ text: `${portData.vulns.length} vulns`, icon: Icon.ExclamationMark });
            }

            return (
              <List.Item
                key={port}
                title={`Port ${port}`}
                subtitle={subtitle}
                accessories={accessories}
                icon={Icon.Network}
                detail={
                  portData ? (
                    <List.Item.Detail
                      markdown={(() => {
                        const bannerText = portData.banner || portData.data;
                        if (!bannerText) return "";

                        return `## Banner/Header Data\n\n\`\`\`\n${bannerText}\n\`\`\``;
                      })()}
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label title="Port" text={port.toString()} />
                          <List.Item.Detail.Metadata.Label
                            title="Protocol"
                            text={getProtocol(port, portData.transport)}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Service"
                            text={portData.product || getServiceName(port)}
                          />
                          {portData.version && (
                            <List.Item.Detail.Metadata.Label title="Version" text={portData.version} />
                          )}
                          {portData.os && <List.Item.Detail.Metadata.Label title="OS" text={portData.os} />}
                          {portData.hostname && (
                            <List.Item.Detail.Metadata.Label title="Hostname" text={portData.hostname} />
                          )}
                          {portData.timestamp && (
                            <List.Item.Detail.Metadata.Label
                              title="Last Seen"
                              text={(() => {
                                try {
                                  const date = new Date(portData.timestamp);
                                  return isNaN(date.getTime()) ? portData.timestamp : date.toLocaleString();
                                } catch {
                                  return portData.timestamp;
                                }
                              })()}
                            />
                          )}
                          {portData.vulns && portData.vulns.length > 0 && (
                            <List.Item.Detail.Metadata.Label
                              title="Vulnerabilities"
                              text={`${portData.vulns.length} found`}
                            />
                          )}
                          {portData.cpe && portData.cpe.length > 0 && (
                            <List.Item.Detail.Metadata.Label
                              title="CPE Entries"
                              text={`${portData.cpe.length} entries`}
                            />
                          )}
                          {(portData.banner || portData.data) && <List.Item.Detail.Metadata.Separator />}
                          {(portData.banner || portData.data) && (
                            <List.Item.Detail.Metadata.Label
                              title="Banner Length"
                              text={`${(portData.banner || portData.data || "").length} characters`}
                            />
                          )}
                        </List.Item.Detail.Metadata>
                      }
                    />
                  ) : undefined
                }
                actions={
                  <ActionPanel>
                    <Action
                      title="Open in Shodan"
                      icon={Icon.Globe}
                      onAction={() => {
                        const url = `https://www.shodan.io/host/${hostInfo.ip_str}#${port}`;
                        console.log("🌐 Opening Shodan for port:", port, "IP:", hostInfo.ip_str, "URL:", url);
                        open(url);
                      }}
                    />
                    {portData?.banner || portData?.data ? (
                      <Action
                        title="View Headers"
                        icon={Icon.Document}
                        onAction={() => {
                          console.log("📄 Viewing headers for port", port);
                          const bannerText = portData.banner || portData.data || "";
                          showToast({
                            style: Toast.Style.Success,
                            title: `Port ${port} Headers`,
                            message: bannerText,
                          });
                        }}
                      />
                    ) : (
                      <Action.CopyToClipboard title="Copy IP" content={hostInfo.ip_str} />
                    )}
                    <Action.CopyToClipboard title="Copy Port" content={port.toString()} />
                    {(portData?.banner || portData?.data) && (
                      <Action.CopyToClipboard title="Copy Banner" content={portData.banner || portData.data || ""} />
                    )}
                    {portData && (
                      <Action
                        title="View Port Details"
                        icon={Icon.Info}
                        onAction={() => {
                          console.log("ℹ️ Viewing port details for", port);
                          showToast({
                            style: Toast.Style.Success,
                            title: `Port ${port} Details`,
                            message: formatPortMetadata(portData, port),
                          });
                        }}
                      />
                    )}
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>,
      );
    }

    // Security Vulnerabilities
    if (hostInfo.vulns && hostInfo.vulns.length > 0) {
      items.push(
        <List.Section key="vulns" title="Security Vulnerabilities">
          {hostInfo.vulns.map((vuln, index) => (
            <List.Item
              key={index}
              title={vuln}
              icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Vulnerability" content={vuln} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>,
      );
    }

    // Tags
    if (hostInfo.tags && hostInfo.tags.length > 0) {
      items.push(
        <List.Section key="tags" title="Tags">
          <List.Item
            title="Tags"
            subtitle={hostInfo.tags.join(", ")}
            icon={Icon.Tag}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard title="Copy Tags" content={hostInfo.tags.join(", ")} />
              </ActionPanel>
            }
          />
        </List.Section>,
      );
    }

    // CPE Information
    if (hostInfo.cpe && hostInfo.cpe.length > 0) {
      items.push(
        <List.Section key="cpe" title="CPE (Common Platform Enumeration)">
          {hostInfo.cpe.map((cpe, index) => (
            <List.Item
              key={index}
              title={cpe}
              icon={Icon.Gear}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard title="Copy Cpe" content={cpe} />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>,
      );
    }

    return items;
  };

  return (
    <List
      isLoading={isLoading}
      searchText={searchText}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Enter IP address or hostname..."
      throttle
      isShowingDetail={true}
    >
      {error && (
        <List.Item title="Error" subtitle={error} icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }} />
      )}
      {!isLoading && !error && !hostInfo && searchText && isValidIPAddress(searchText.trim()) && (
        <List.Item
          title="No results found"
          subtitle="Try a different IP address or hostname"
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
        />
      )}
      {!isLoading && !error && !hostInfo && searchText && !isValidIPAddress(searchText.trim()) && (
        <List.Item
          title="Invalid IP address or hostname"
          subtitle="Please enter a valid IPv4, IPv6, or domain name"
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Orange }}
        />
      )}
      {!searchText && (
        <>
          <List.Item
            title="Enter an IP address or hostname"
            subtitle="Start typing to search Shodan"
            icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
          />
          {searchHistory.length > 0 && (
            <List.Section title="Recent Searches">
              {searchHistory.map((item) => (
                <List.Item
                  key={`${item.ip}-${item.timestamp}`}
                  title={item.ip}
                  subtitle={new Date(item.timestamp).toLocaleDateString()}
                  icon={Icon.Network}
                  actions={
                    <ActionPanel>
                      <Action
                        title="Search Again"
                        icon={Icon.MagnifyingGlass}
                        onAction={() => {
                          setSearchText(item.ip);
                          handleSearch(item.ip);
                        }}
                      />
                      <Action.CopyToClipboard title="Copy IP" content={item.ip} />
                      <Action
                        title="Open in Shodan"
                        icon={Icon.Globe}
                        onAction={() => open(`https://www.shodan.io/host/${item.ip}`)}
                      />
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
      {renderHostInfo()}
    </List>
  );
}
