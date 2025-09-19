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
  open,
  LaunchProps,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { ShodanAPI, ShodanScanRequest, ShodanScanStatus, ShodanScanResult } from "./shodan-api";
import { COMMON_SERVICES, getProtocolsFromCategory } from "./protocol-categories";

interface ScanOndemandArguments {
  ips?: string;
  services?: string;
}

// Recent scans interface
interface RecentScanItem {
  id: string;
  ips: string;
  services: string;
  protocols?: string[]; // Store the actual protocol names for search reconstruction (optional for backward compatibility)
  timestamp: number;
  status: string;
  totalResults?: number;
}

// Quick scan actions
const QUICK_SCAN_ACTIONS = [
  {
    name: "All Services",
    description: "Scan all available services (no filtering)",
    icon: Icon.Globe,
    action: "all-scan",
  },
  {
    name: "Common Services",
    description: "HTTP, HTTPS, SSH, FTP, SMTP, etc.",
    icon: Icon.Network,
    action: "common-scan",
  },
  {
    name: "Web Services",
    description: "HTTP, HTTPS, and web-related protocols",
    icon: Icon.Globe,
    action: "web-scan",
  },
  {
    name: "Database Services",
    description: "MySQL, PostgreSQL, MongoDB, Redis, etc.",
    icon: Icon.Gear,
    action: "database-scan",
  },
  {
    name: "Industrial & IoT",
    description: "Modbus, S7, BACnet, EtherNet/IP, etc.",
    icon: Icon.ComputerChip,
    action: "iot-scan",
  },
  {
    name: "Cameras & Video",
    description: "RTSP, Dahua DVR, ONVIF, etc.",
    icon: Icon.Camera,
    action: "camera-scan",
  },
  {
    name: "Network Services",
    description: "SSH, FTP, SMTP, DNS, Telnet, etc.",
    icon: Icon.Network,
    action: "network-scan",
  },
  {
    name: "Remote Access",
    description: "RDP, VNC, TeamViewer, etc.",
    icon: Icon.Desktop,
    action: "remote-scan",
  },
  {
    name: "Gaming & Entertainment",
    description: "Minecraft, Steam, PlayStation, etc.",
    icon: Icon.GameController,
    action: "gaming-scan",
  },
  {
    name: "Cryptocurrency",
    description: "Bitcoin, Ethereum, Monero, etc.",
    icon: Icon.Coin,
    action: "crypto-scan",
  },
  {
    name: "Security & Monitoring",
    description: "ClamAV, Tor, SOCKS5, etc.",
    icon: Icon.Lock,
    action: "security-scan",
  },
  {
    name: "Smart Home & IoT",
    description: "TP-Link Kasa, Tuya, Xiaomi, etc.",
    icon: Icon.House,
    action: "smarthome-scan",
  },
  {
    name: "Messaging & Communication",
    description: "IRC, XMPP, SIP, Mumble, etc.",
    icon: Icon.Message,
    action: "messaging-scan",
  },
  {
    name: "File Sharing & Storage",
    description: "SMB, NFS, FTP, AFP, etc.",
    icon: Icon.Folder,
    action: "fileshare-scan",
  },
  {
    name: "Development & Tools",
    description: "Git, Java RMI, WebLogic, etc.",
    icon: Icon.Code,
    action: "dev-scan",
  },
  {
    name: "Printers & Peripherals",
    description: "Printers, scanners, biometric devices",
    icon: Icon.Print,
    action: "printer-scan",
  },
];

export default function ScanOndemand(props: LaunchProps<{ arguments: ScanOndemandArguments }>) {
  const [searchText, setSearchText] = useState(props.arguments.ips || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>([]);
  const [scanStatuses, setScanStatuses] = useState<Map<string, ShodanScanStatus>>(new Map());
  const [scanResults, setScanResults] = useState<Map<string, ShodanScanResult>>(new Map());
  const shodanAPI = new ShodanAPI();

  // Helper function to build search query from scan parameters
  const buildSearchQuery = (scan: RecentScanItem): string => {
    const ipList = scan.ips
      .split(",")
      .map((ip) => ip.trim())
      .join(",");
    const netQuery = `net:${ipList}`;

    // Handle backward compatibility - protocols might be undefined for older scans
    const protocols = scan.protocols || [];

    if (protocols.length === 0) {
      // No protocol filtering - just search by IPs
      return netQuery;
    }

    const protocolQuery = protocols.map((protocol) => `shodan.module:${protocol}`).join(" ");
    return `${netQuery} ${protocolQuery}`;
  };

  // Load recent scans on component mount
  useEffect(() => {
    loadRecentScans();
  }, []);

  // Polling effect for active scans
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (isPolling && recentScans.length > 0) {
      intervalId = setInterval(async () => {
        const activeScans = recentScans.filter((scan) => scan.status === "PENDING" || scan.status === "RUNNING");

        if (activeScans.length === 0) {
          setIsPolling(false);
          return;
        }

        for (const scan of activeScans) {
          try {
            const status = await shodanAPI.getScanStatus(scan.id);
            setScanStatuses((prev) => new Map(prev.set(scan.id, status)));

            if (status.status === "DONE") {
              // Fetch results when scan is complete
              const results = await shodanAPI.getScanResults(scan.id);
              setScanResults((prev) => new Map(prev.set(scan.id, results)));

              // Update recent scans
              updateRecentScan(scan.id, { status: "DONE", totalResults: results.total });

              showToast({
                style: Toast.Style.Success,
                title: "Scan Complete",
                message: `Scan ${scan.id} found ${results.total} results`,
              });
            } else if (status.status === "ERROR") {
              updateRecentScan(scan.id, { status: "ERROR" });
              showToast({
                style: Toast.Style.Failure,
                title: "Scan Failed",
                message: `Scan ${scan.id} encountered an error`,
              });
            }
          } catch (err) {
            console.error(`Error checking scan ${scan.id}:`, err);
          }
        }
      }, 10000); // Poll every 10 seconds
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isPolling, recentScans]);

  const loadRecentScans = async () => {
    try {
      const history = await LocalStorage.getItem<string>("recentScans");
      if (history) {
        const parsedHistory = JSON.parse(history) as RecentScanItem[];
        setRecentScans(parsedHistory);

        // Check if there are any active scans to poll
        const hasActiveScans = parsedHistory.some((scan) => scan.status === "PENDING" || scan.status === "RUNNING");
        if (hasActiveScans) {
          setIsPolling(true);
        }
      }
    } catch (error) {
      console.error("Failed to load recent scans:", error);
    }
  };

  const saveRecentScans = async (scans: RecentScanItem[]) => {
    try {
      setRecentScans(scans);
      await LocalStorage.setItem("recentScans", JSON.stringify(scans));
    } catch (error) {
      console.error("Failed to save recent scans:", error);
    }
  };

  const updateRecentScan = (scanId: string, updates: Partial<RecentScanItem>) => {
    const updatedScans = recentScans.map((scan) => (scan.id === scanId ? { ...scan, ...updates } : scan));
    saveRecentScans(updatedScans);
  };

  const addRecentScan = async (scan: RecentScanItem) => {
    const updatedScans = [scan, ...recentScans.filter((s) => s.id !== scan.id)].slice(0, 20);
    await saveRecentScans(updatedScans);
    setIsPolling(true);
  };

  const clearRecentScans = async () => {
    try {
      setRecentScans([]);
      await LocalStorage.removeItem("recentScans");
      showToast({ title: "Recent scans cleared", style: Toast.Style.Success });
    } catch (error) {
      console.error("Failed to clear recent scans:", error);
      showToast({ title: "Failed to clear scans", style: Toast.Style.Failure });
    }
  };

  const handleQuickScan = async (action: string, ips?: string) => {
    let scanRequest: ShodanScanRequest;

    switch (action) {
      case "all-scan":
        // No service filtering - scan all available services
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: [], // Empty array means no service filtering
        };
        break;
      case "common-scan":
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: COMMON_SERVICES.map((s) => [s.port, s.protocol]),
        };
        break;
      case "web-scan": {
        const webProtocols = getProtocolsFromCategory("Web Services");
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: webProtocols.slice(0, 10).map((p, i) => [80 + i, p.name]),
        };
        break;
      }
      case "database-scan": {
        const dbProtocols = getProtocolsFromCategory("Databases");
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: dbProtocols.slice(0, 10).map((p, i) => [3306 + i, p.name]),
        };
        break;
      }
      case "iot-scan": {
        const iotProtocols = getProtocolsFromCategory("Industrial & IoT");
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: iotProtocols.slice(0, 10).map((p, i) => [502 + i, p.name]),
        };
        break;
      }
      case "camera-scan": {
        const cameraProtocols = getProtocolsFromCategory("Cameras & Video");
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: cameraProtocols.slice(0, 10).map((p, i) => [554 + i, p.name]),
        };
        break;
      }
      case "network-scan": {
        const networkProtocols = getProtocolsFromCategory("Network Services");
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: networkProtocols.slice(0, 10).map((p, i) => [22 + i, p.name]),
        };
        break;
      }
      case "remote-scan": {
        const remoteProtocols = getProtocolsFromCategory("Remote Access");
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: remoteProtocols.slice(0, 10).map((p, i) => [3389 + i, p.name]),
        };
        break;
      }
      case "gaming-scan": {
        const gamingProtocols = getProtocolsFromCategory("Gaming & Entertainment");
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: gamingProtocols.slice(0, 10).map((p, i) => [25565 + i, p.name]),
        };
        break;
      }
      case "crypto-scan": {
        const cryptoProtocols = getProtocolsFromCategory("Cryptocurrency");
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: cryptoProtocols.slice(0, 10).map((p, i) => [8333 + i, p.name]),
        };
        break;
      }
      case "security-scan": {
        const securityProtocols = getProtocolsFromCategory("Security & Monitoring");
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: securityProtocols.slice(0, 10).map((p, i) => [161 + i, p.name]),
        };
        break;
      }
      case "smarthome-scan": {
        const smarthomeProtocols = getProtocolsFromCategory("Smart Home & IoT");
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: smarthomeProtocols.slice(0, 10).map((p, i) => [8080 + i, p.name]),
        };
        break;
      }
      case "messaging-scan": {
        const messagingProtocols = getProtocolsFromCategory("Messaging & Communication");
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: messagingProtocols.slice(0, 10).map((p, i) => [6667 + i, p.name]),
        };
        break;
      }
      case "fileshare-scan": {
        const fileshareProtocols = getProtocolsFromCategory("File Sharing & Storage");
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: fileshareProtocols.slice(0, 10).map((p, i) => [445 + i, p.name]),
        };
        break;
      }
      case "dev-scan": {
        const devProtocols = getProtocolsFromCategory("Development & Tools");
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: devProtocols.slice(0, 10).map((p, i) => [9418 + i, p.name]),
        };
        break;
      }
      case "printer-scan": {
        const printerProtocols = getProtocolsFromCategory("Printers & Peripherals");
        scanRequest = {
          ips: ips || "8.8.8.8",
          service: printerProtocols.slice(0, 10).map((p, i) => [9100 + i, p.name]),
        };
        break;
      }
      default:
        return;
    }

    await requestScan(scanRequest);
  };

  const requestScan = async (scanRequest: ShodanScanRequest) => {
    setIsLoading(true);
    setError(null);

    try {
      console.log("🔍 Requesting scan with:", scanRequest);
      const result = await shodanAPI.requestScan(scanRequest);
      console.log("✅ Scan requested successfully:", result);

      const recentScan: RecentScanItem = {
        id: result.id,
        ips: scanRequest.ips,
        services:
          scanRequest.service.length > 0
            ? scanRequest.service.map(([, protocol]) => `${protocol}`).join(", ")
            : "All Services",
        protocols: scanRequest.service.map(([, protocol]) => protocol),
        timestamp: Date.now(),
        status: result.status,
      };

      await addRecentScan(recentScan);

      showToast({
        style: Toast.Style.Success,
        title: "Scan requested",
        message: `Scan ID: ${result.id} - Monitoring progress...`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      console.error("❌ Scan error:", errorMessage);
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Scan failed",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DONE":
        return { source: Icon.CheckCircle, tintColor: Color.Green };
      case "RUNNING":
        return { source: Icon.Clock, tintColor: Color.Blue };
      case "PENDING":
        return { source: Icon.Clock, tintColor: Color.Orange };
      case "ERROR":
        return { source: Icon.ExclamationMark, tintColor: Color.Red };
      default:
        return { source: Icon.QuestionMark, tintColor: Color.SecondaryText };
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "DONE":
        return "Complete";
      case "RUNNING":
        return "Running";
      case "PENDING":
        return "Pending";
      case "ERROR":
        return "Error";
      default:
        return status;
    }
  };

  const renderScanItem = (scan: RecentScanItem) => {
    const status = scanStatuses.get(scan.id) || { status: scan.status };
    const results = scanResults.get(scan.id);
    const statusIcon = getStatusIcon(status.status);
    const statusText = getStatusText(status.status);

    return (
      <List.Item
        key={scan.id}
        title={`Scan ${scan.id}`}
        subtitle={`${scan.ips} • ${statusText}`}
        icon={statusIcon}
        accessories={[
          { text: new Date(scan.timestamp).toLocaleDateString() },
          ...(results ? [{ text: `${results.total} results` }] : []),
          ...(scan.totalResults ? [{ text: `${scan.totalResults} results` }] : []),
        ]}
        detail={
          <List.Item.Detail
            markdown={`# Scan ${scan.id}

**Status:** ${statusText}
**IPs:** ${scan.ips}
**Services:** ${scan.services}
**Created:** ${new Date(scan.timestamp).toLocaleString()}
**Credits Left:** ${"credits_left" in status ? status.credits_left : "Unknown"}

${
  results
    ? `## Results\n\n**Total Results:** ${results.total}\n\n### Found Hosts:\n${results.matches
        .slice(0, 5)
        .map(
          (host, i) =>
            `${i + 1}. **${host.ip_str}**${host.hostnames?.[0] ? ` (${host.hostnames[0]})` : ""}${host.ports?.length ? ` - Ports: ${host.ports.slice(0, 3).join(", ")}` : ""}`,
        )
        .join("\n")}${results.matches.length > 5 ? `\n\n*... and ${results.matches.length - 5} more results*` : ""}`
    : ""
}`}
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label title="Scan ID" text={scan.id} />
                <List.Item.Detail.Metadata.Label title="Status" text={statusText} />
                <List.Item.Detail.Metadata.Label title="IPs" text={scan.ips} />
                <List.Item.Detail.Metadata.Label title="Services" text={scan.services} />
                <List.Item.Detail.Metadata.Label title="Created" text={new Date(scan.timestamp).toLocaleString()} />
                {results && <List.Item.Detail.Metadata.Label title="Total Results" text={results.total.toString()} />}
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            {/* Primary action based on scan status */}
            {status.status === "DONE" || scan.status === "DONE" ? (
              <Action
                title="View Scan Results"
                icon={Icon.MagnifyingGlass}
                onAction={() => {
                  const searchQuery = buildSearchQuery(scan);
                  launchCommand({
                    name: "search-criteria",
                    type: LaunchType.UserInitiated,
                    arguments: { query: searchQuery },
                  });
                }}
              />
            ) : (
              <Action
                title="Refresh Status"
                icon={Icon.ArrowClockwise}
                onAction={async () => {
                  try {
                    const status = await shodanAPI.getScanStatus(scan.id);
                    setScanStatuses((prev) => new Map(prev.set(scan.id, status)));
                    updateRecentScan(scan.id, { status: status.status });

                    if (status.status === "DONE") {
                      // Fetch results when scan is complete
                      const results = await shodanAPI.getScanResults(scan.id);
                      setScanResults((prev) => new Map(prev.set(scan.id, results)));
                      updateRecentScan(scan.id, { totalResults: results.total });

                      showToast({
                        style: Toast.Style.Success,
                        title: "Scan Complete",
                        message: `Found ${results.total} results`,
                      });
                    }
                  } catch {
                    showToast({
                      style: Toast.Style.Failure,
                      title: "Failed to refresh",
                      message: "Could not get scan status",
                    });
                  }
                }}
              />
            )}

            {/* Secondary actions */}
            <Action.CopyToClipboard title="Copy Scan ID" content={scan.id} />

            {results && (
              <Action
                title="View Full Results"
                icon={Icon.MagnifyingGlass}
                onAction={() => {
                  const searchQuery = buildSearchQuery(scan);
                  launchCommand({
                    name: "search-criteria",
                    type: LaunchType.UserInitiated,
                    arguments: { query: searchQuery },
                  });
                }}
              />
            )}

            <Action title="Open in Shodan" icon={Icon.Globe} onAction={() => open("https://www.shodan.io/")} />

            <Action
              title="Delete Scan"
              icon={Icon.Trash}
              style={Action.Style.Destructive}
              onAction={() => {
                const updatedScans = recentScans.filter((s) => s.id !== scan.id);
                saveRecentScans(updatedScans);
                showToast({
                  style: Toast.Style.Success,
                  title: "Scan deleted",
                  message: `Removed scan ${scan.id}`,
                });
              }}
            />
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
      searchBarPlaceholder="Enter IP addresses or netblocks to scan..."
      throttle
      isShowingDetail={true}
    >
      {error && (
        <List.Item title="Error" subtitle={error} icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }} />
      )}

      {!searchText && (
        <>
          <List.Item
            title="Enter IP addresses to scan"
            subtitle="Start typing IP addresses or netblocks to scan"
            icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
          />

          <List.Section title="Quick Scan Actions">
            {QUICK_SCAN_ACTIONS.map((action) => (
              <List.Item
                key={action.action}
                title={action.name}
                subtitle={action.description}
                icon={action.icon}
                actions={
                  <ActionPanel>
                    <Action
                      title={`Start ${action.name}`}
                      icon={Icon.MagnifyingGlass}
                      onAction={() => handleQuickScan(action.action)}
                    />
                    {searchText && (
                      <Action
                        title={`Scan ${searchText}`}
                        icon={Icon.MagnifyingGlass}
                        onAction={() => handleQuickScan(action.action, searchText)}
                      />
                    )}
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>

          {recentScans.length > 0 && (
            <List.Section
              title={`Recent Scans (${recentScans.length})`}
              subtitle={isPolling ? "Monitoring active scans..." : ""}
            >
              {recentScans.map(renderScanItem)}
              <List.Item
                title="Clear All Scans"
                subtitle={`${recentScans.length} scans`}
                icon={{ source: Icon.Trash, tintColor: Color.Red }}
                actions={
                  <ActionPanel>
                    <Action
                      title="Clear All Scans"
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={clearRecentScans}
                    />
                  </ActionPanel>
                }
              />
            </List.Section>
          )}
        </>
      )}

      {searchText && (
        <List.Section title={`Scan Options for ${searchText}`}>
          {QUICK_SCAN_ACTIONS.map((action) => (
            <List.Item
              key={action.action}
              title={`${action.name} Scan`}
              subtitle={action.description}
              icon={action.icon}
              actions={
                <ActionPanel>
                  <Action
                    title={`Start ${action.name} Scan`}
                    icon={Icon.MagnifyingGlass}
                    onAction={() => handleQuickScan(action.action, searchText)}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}
    </List>
  );
}
