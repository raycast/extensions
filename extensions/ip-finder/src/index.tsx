//Copyright © 2025 Sam Analytic Solutions
//All rights reserved.

// @ts-nocheck
import { useState, useEffect } from "react";
import {
  ActionPanel,
  Action,
  List,
  Icon,
  showToast,
  Toast,
  getPreferenceValues,
  Form,
  useNavigation,
  Detail,
  showHUD,
  LocalStorage,
  Clipboard,
  Alert,
  confirmAlert,
} from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { networkInterfaces, platform } from "os";
import { promises as dns } from "dns";

const execAsync = promisify(exec);

interface DeviceInfo {
  ip: string;
  mac?: string;
  manufacturer?: string;
  hostname?: string;
  openPorts?: number[];
  isOnline: boolean;
  lastSeen: Date;
}

interface NetworkInfo {
  localIP: string;
  subnet: string;
  assignedIPs: string[];
  recommendedIPs: string[];
  devices: DeviceInfo[];
  isScanning: boolean;
  scanProgress: number;
  lastScanTime?: Date;
}

interface Preferences {
  defaultTimeout: string;
  defaultMaxThreads: string;
  defaultRecommendations: string;
  autoScanOnOpen: boolean;
  showProgressBar: boolean;
  scanCommonRanges: boolean;
  gatherDeviceInfo: boolean;
  scanPorts: boolean;
}

interface ScanForm {
  subnet: string;
  timeout: string;
  maxThreads: string;
  recommendations: string;
}

interface ScanHistory {
  subnet: string;
  timestamp: Date;
  assignedCount: number;
  recommendedCount: number;
}

export default function Command() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const preferences = getPreferenceValues<Preferences>();
  const { push, pop } = useNavigation();

  useEffect(() => {
    initializeNetwork();
    loadScanHistory();
  }, []);

  const initializeNetwork = async () => {
    try {
      const localIP = getLocalIP();
      const subnet = getSubnetFromIP(localIP);

      setNetworkInfo({
        localIP,
        subnet,
        assignedIPs: [],
        recommendedIPs: [],
        devices: [],
        isScanning: false,
        scanProgress: 0,
      });

      // Auto-scan if enabled in preferences
      if (preferences.autoScanOnOpen) {
        setTimeout(() => {
          handleScan();
        }, 500);
      }
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Error",
        message: "Failed to initialize network information",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadScanHistory = async () => {
    try {
      const history = await LocalStorage.getItem<string>("scanHistory");
      if (history) {
        const parsed = JSON.parse(history);
        setScanHistory(
          parsed.map((item: any) => ({
            ...item,
            timestamp: new Date(item.timestamp),
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load scan history:", error);
    }
  };

  const saveScanHistory = async (
    subnet: string,
    assignedCount: number,
    recommendedCount: number,
  ) => {
    try {
      const newHistory = [
        {
          subnet,
          timestamp: new Date(),
          assignedCount,
          recommendedCount,
        },
        ...scanHistory.slice(0, 9), // Keep last 10 scans
      ];
      setScanHistory(newHistory);
      await LocalStorage.setItem("scanHistory", JSON.stringify(newHistory));
    } catch (error) {
      console.error("Failed to save scan history:", error);
    }
  };

  const getLocalIP = (): string => {
    const interfaces = networkInterfaces();

    for (const name of Object.keys(interfaces)) {
      const interfaceInfo = interfaces[name];
      if (interfaceInfo) {
        for (const info of interfaceInfo) {
          if (info.family === "IPv4" && !info.internal) {
            return info.address;
          }
        }
      }
    }

    return "192.168.1.1"; // Fallback
  };

  const getSubnetFromIP = (ip: string): string => {
    const parts = ip.split(".");
    return `${parts[0]}.${parts[1]}.${parts[2]}.0/24`;
  };

  const getARPTable = async (): Promise<Map<string, string>> => {
    const arpMap = new Map<string, string>();
    try {
      const isWindows = platform() === "win32";
      const command = isWindows ? "arp -a" : "arp -n";
      const { stdout } = await execAsync(command);

      const lines = stdout.split("\n");
      for (const line of lines) {
        const match = line.match(/(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F-:]+)/);
        if (match) {
          const ip = match[1];
          const mac = match[2].replace(/-/g, ":").toUpperCase();
          arpMap.set(ip, mac);
        }
      }
    } catch (error) {
      console.error("Failed to get ARP table:", error);
    }
    return arpMap;
  };

  const getManufacturer = async (mac: string): Promise<string | undefined> => {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(`https://api.macvendors.com/${mac}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.text();
      }
    } catch (error) {
      console.error("Failed to get manufacturer:", error);
    }
    return undefined;
  };

  const getHostname = async (ip: string): Promise<string | undefined> => {
    try {
      // Add timeout to prevent hanging
      const hostnamePromise = dns.reverse(ip);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("DNS timeout")), 2000),
      );

      const [hostname] = (await Promise.race([
        hostnamePromise,
        timeoutPromise,
      ])) as [string];
      return hostname;
    } catch (error) {
      return undefined;
    }
  };

  const getPortService = (port: number): string => {
    const portServices: { [key: number]: string } = {
      21: "FTP",
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
      8080: "HTTP-Alt",
      8443: "HTTPS-Alt",
      3306: "MySQL",
      5432: "PostgreSQL",
      27017: "MongoDB",
      6379: "Redis",
      9200: "Elasticsearch",
      11211: "Memcached",
    };
    return portServices[port] || `Port ${port}`;
  };

  const scanPorts = async (ip: string, ports: number[]): Promise<number[]> => {
    const openPorts: number[] = [];
    const isWindows = platform() === "win32";
    const isMac = platform() === "darwin";

    // Common ports to scan
    const commonPorts =
      ports.length > 0
        ? ports
        : [21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 8080, 8443];

    // Try multiple methods for port scanning
    for (const port of commonPorts) {
      try {
        let command: string;
        let success = false;

        // Method 1: Platform-specific commands
        if (isWindows) {
          command = `powershell -Command "Test-NetConnection -ComputerName ${ip} -Port ${port} -InformationLevel Quiet"`;
        } else if (isMac) {
          command = `nc -z -G 1 ${ip} ${port}`;
        } else {
          command = `nc -z -w 1 ${ip} ${port}`;
        }

        try {
          await execAsync(command, { timeout: 2000 });
          success = true;
        } catch (error) {
          // Try alternative method
          if (isWindows) {
            command = `telnet ${ip} ${port}`;
          } else {
            command = `timeout 2 bash -c "</dev/tcp/${ip}/${port}"`;
          }

          try {
            await execAsync(command, { timeout: 2000 });
            success = true;
          } catch (error2) {
            // Last resort: try with curl
            try {
              command = `curl -s --connect-timeout 2 ${ip}:${port}`;
              await execAsync(command, { timeout: 2000 });
              success = true;
            } catch (error3) {
              // Port is closed or unreachable
            }
          }
        }

        if (success) {
          openPorts.push(port);
        }
      } catch (error) {
        // Port is closed
      }
    }

    return openPorts;
  };

  const getPingCommand = (ip: string, timeout: number): string => {
    const isWindows = platform() === "win32";
    if (isWindows) {
      return `ping -n 1 -w ${timeout * 1000} ${ip}`;
    } else {
      return `ping -c 1 -W ${timeout} ${ip}`;
    }
  };

  const isPingSuccessful = (stdout: string): boolean => {
    const isWindows = platform() === "win32";
    if (isWindows) {
      return (
        stdout.includes("Reply from") && !stdout.includes("Request timed out")
      );
    } else {
      // More robust detection for macOS/Linux
      return (
        stdout.includes("1 packets transmitted, 1 received") ||
        stdout.includes("1 received") ||
        stdout.includes("bytes from") ||
        stdout.includes("time=")
      );
    }
  };

  const validateSubnet = (subnet: string): boolean => {
    const subnetRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!subnetRegex.test(subnet)) return false;

    const parts = subnet.split("/");
    if (parts.length !== 2) return false;

    const ip = parts[0];
    const mask = parseInt(parts[1] || "0");

    if (!ip || isNaN(mask) || mask < 1 || mask > 32) return false;

    const ipParts = ip.split(".").map(Number);
    if (ipParts.length !== 4) return false;

    return ipParts.every((part) => !isNaN(part) && part >= 0 && part <= 255);
  };

  const scanNetworkWithRecommendations = async (
    subnet: string,
    timeout: number,
    maxThreads: number,
    recommendations: number,
  ) => {
    if (!networkInfo) return;

    setNetworkInfo((prev) =>
      prev ? { ...prev, isScanning: true, scanProgress: 0 } : null,
    );

    try {
      showToast({
        style: Toast.Style.Animated,
        title: "Scanning Network",
        message: `Scanning ${subnet}...`,
      });

      const assignedIPs: string[] = [];
      const devices: DeviceInfo[] = [];
      const networkParts = subnet.split("/");
      if (networkParts.length !== 2) {
        throw new Error("Invalid subnet format");
      }

      const baseIP = networkParts[0];
      const mask = parseInt(networkParts[1] || "0");

      if (!baseIP || isNaN(mask)) {
        throw new Error("Invalid subnet format");
      }

      let totalIPs = Math.pow(2, 32 - mask) - 2;
      const baseParts = baseIP.split(".").map(Number);

      // If scanCommonRanges is enabled, only scan common ranges
      if (preferences.scanCommonRanges) {
        totalIPs = Math.min(totalIPs, 254); // Limit to common ranges
      }

      const chunkSize = Math.min(maxThreads, 50);
      const chunks = Math.ceil(totalIPs / chunkSize);

      for (let chunk = 0; chunk < chunks; chunk++) {
        const promises: Promise<void>[] = [];

        for (let i = 0; i < chunkSize; i++) {
          const ipIndex = chunk * chunkSize + i;
          if (ipIndex >= totalIPs) break;

          const ip = calculateIP(baseParts, ipIndex);
          promises.push(pingIP(ip, timeout, assignedIPs));
        }

        await Promise.all(promises);

        if (preferences.showProgressBar) {
          const progress = Math.round(((chunk + 1) / chunks) * 100);
          setNetworkInfo((prev) =>
            prev ? { ...prev, scanProgress: progress } : null,
          );
        }
      }

      // Get device information for assigned IPs (if enabled)
      if (preferences.gatherDeviceInfo && assignedIPs.length > 0) {
        const message = preferences.scanPorts
          ? "Getting MAC addresses, device details, and scanning ports..."
          : "Getting MAC addresses and device details...";

        showToast({
          style: Toast.Style.Animated,
          title: "Gathering Device Info",
          message: message,
        });

        const arpTable = await getARPTable();

        // Process device info in parallel with timeout
        const devicePromises = assignedIPs.map(async (ip) => {
          try {
            const mac = arpTable.get(ip);

            // Get manufacturer, hostname, and ports in parallel with timeout
            const [manufacturer, hostname, openPorts] =
              await Promise.allSettled([
                mac ? getManufacturer(mac) : Promise.resolve(undefined),
                getHostname(ip),
                preferences.scanPorts ? scanPorts(ip, []) : Promise.resolve([]),
              ]);

            // Debug logging for port scanning
            if (preferences.scanPorts && openPorts.status === "fulfilled") {
              console.log(
                `Port scan for ${ip}: ${openPorts.value.length} ports found - ${openPorts.value.join(", ")}`,
              );
            }

            return {
              ip,
              mac,
              manufacturer:
                manufacturer.status === "fulfilled"
                  ? manufacturer.value
                  : undefined,
              hostname:
                hostname.status === "fulfilled" ? hostname.value : undefined,
              openPorts:
                openPorts.status === "fulfilled" ? openPorts.value : undefined,
              isOnline: true,
              lastSeen: new Date(),
            };
          } catch (error) {
            // Fallback if device info gathering fails
            return {
              ip,
              mac: arpTable.get(ip),
              manufacturer: undefined,
              hostname: undefined,
              openPorts: undefined,
              isOnline: true,
              lastSeen: new Date(),
            };
          }
        });

        // Wait for all device info with a timeout
        const deviceResults = await Promise.allSettled(devicePromises);
        devices.push(
          ...deviceResults
            .filter((result) => result.status === "fulfilled")
            .map(
              (result) => (result as PromiseFulfilledResult<DeviceInfo>).value,
            ),
        );
      } else {
        // Create basic device info without detailed lookup
        devices.push(
          ...assignedIPs.map((ip) => ({
            ip,
            mac: undefined,
            manufacturer: undefined,
            hostname: undefined,
            openPorts: undefined,
            isOnline: true,
            lastSeen: new Date(),
          })),
        );
      }

      const recommendedIPs = generateRecommendations(
        subnet,
        assignedIPs,
        recommendations,
      );

      setNetworkInfo((prev) =>
        prev
          ? {
              ...prev,
              assignedIPs,
              recommendedIPs,
              devices,
              isScanning: false,
              scanProgress: 100,
              lastScanTime: new Date(),
            }
          : null,
      );

      // Save to history
      await saveScanHistory(subnet, assignedIPs.length, recommendedIPs.length);

      showToast({
        style: Toast.Style.Success,
        title: "Scan Complete",
        message: `Found ${assignedIPs.length} assigned IPs`,
      });
    } catch (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Scan Failed",
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setNetworkInfo((prev) => (prev ? { ...prev, isScanning: false } : null));
    }
  };

  const calculateIP = (baseParts: number[], index: number): string => {
    const ip = [...baseParts];
    if (ip[3] !== undefined) {
      ip[3] = ip[3] + index + 1;
    }

    for (let i = 3; i > 0; i--) {
      if (ip[i] !== undefined && ip[i] > 255) {
        ip[i] = ip[i] % 256;
        if (ip[i - 1] !== undefined) {
          ip[i - 1]++;
        }
      }
    }

    return ip.join(".");
  };

  const pingIP = async (
    ip: string,
    timeout: number,
    assignedIPs: string[],
  ): Promise<void> => {
    try {
      const command = getPingCommand(ip, timeout);
      const { stdout } = await execAsync(command, {
        timeout: (timeout + 1) * 1000,
      });

      if (isPingSuccessful(stdout)) {
        assignedIPs.push(ip);
      }
    } catch (error) {
      // IP is not reachable, which is expected for most IPs
      // For debugging on macOS, you can uncomment the next line:
      // console.log(`Ping failed for ${ip}:`, error.message);
    }
  };

  const generateRecommendations = (
    subnet: string,
    assignedIPs: string[],
    count: number,
  ): string[] => {
    const networkParts = subnet.split("/");
    if (networkParts.length !== 2) {
      return [];
    }

    const baseIP = networkParts[0];
    if (!baseIP) {
      return [];
    }

    const baseParts = baseIP.split(".").map(Number);
    const recommendations: string[] = [];

    for (let i = 1; i <= 254 && recommendations.length < count; i++) {
      const ip = calculateIP(baseParts, i - 1);
      if (!assignedIPs.includes(ip)) {
        recommendations.push(ip);
      }
    }

    return recommendations;
  };

  const scanNetwork = async (
    subnet: string,
    timeout: number,
    maxThreads: number,
  ) => {
    const recommendations = parseInt(preferences.defaultRecommendations) || 10;
    await scanNetworkWithRecommendations(
      subnet,
      timeout,
      maxThreads,
      recommendations,
    );
  };

  const handleScan = () => {
    if (!networkInfo) return;

    const timeout = parseFloat(preferences.defaultTimeout) || 1.0;
    const maxThreads = parseInt(preferences.defaultMaxThreads) || 50;

    scanNetwork(networkInfo.subnet, timeout, maxThreads);
  };

  const handleCustomScan = (values: ScanForm) => {
    const subnet = values.subnet.trim();

    if (!validateSubnet(subnet)) {
      showToast({
        style: Toast.Style.Failure,
        title: "Invalid Subnet",
        message:
          "Please enter a valid subnet in CIDR notation (e.g., 192.168.1.0/24)",
      });
      return;
    }

    const timeout = parseFloat(values.timeout) || 1.0;
    const maxThreads = parseInt(values.maxThreads) || 50;
    const recommendations = parseInt(values.recommendations) || 10;

    setNetworkInfo((prev) =>
      prev
        ? {
            ...prev,
            subnet,
            assignedIPs: [],
            recommendedIPs: [],
            devices: [],
            isScanning: false,
            scanProgress: 0,
          }
        : null,
    );

    pop();

    setTimeout(() => {
      scanNetworkWithRecommendations(
        subnet,
        timeout,
        maxThreads,
        recommendations,
      );
    }, 100);
  };

  const showScanForm = () => {
    push(
      <Form
        actions={
          <ActionPanel>
            <Action.SubmitForm
              title="Start Custom Scan"
              icon={Icon.Play}
              onSubmit={handleCustomScan}
            />
            <Action
              title="Cancel"
              icon={Icon.XmarkCircle}
              onAction={() => pop()}
            />
          </ActionPanel>
        }
      >
        <Form.TextField
          id="subnet"
          title="Subnet to Scan"
          placeholder="192.168.1.0/24"
          defaultValue={networkInfo?.subnet || ""}
          info="Enter subnet in CIDR notation (e.g., 192.168.1.0/24, 10.0.0.0/16)"
        />
        <Form.TextField
          id="timeout"
          title="Timeout (seconds)"
          placeholder="1.0"
          defaultValue={preferences.defaultTimeout || "1.0"}
          info="Timeout for each ping attempt"
        />
        <Form.TextField
          id="maxThreads"
          title="Max Threads"
          placeholder="50"
          defaultValue={preferences.defaultMaxThreads || "50"}
          info="Maximum concurrent ping attempts"
        />
        <Form.TextField
          id="recommendations"
          title="Recommendations"
          placeholder="10"
          defaultValue={preferences.defaultRecommendations || "10"}
          info="Number of available IPs to recommend"
        />
      </Form>,
    );
  };

  const showDetails = () => {
    if (!networkInfo) return;

    push(
      <Detail
        markdown={generateDetailMarkdown(networkInfo)}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="Copy Network Info"
              content={generateDetailMarkdown(networkInfo)}
            />
            <Action.CopyToClipboard
              title="Copy Assigned Ips"
              content={networkInfo.assignedIPs.join("\n")}
            />
            <Action.CopyToClipboard
              title="Copy Recommended Ips"
              content={networkInfo.recommendedIPs.join("\n")}
            />
            <Action
              title="Export as JSON"
              icon={Icon.Document}
              onAction={async () => {
                const exportData = {
                  timestamp: new Date().toISOString(),
                  localIP: networkInfo.localIP,
                  subnet: networkInfo.subnet,
                  assignedIPs: networkInfo.assignedIPs,
                  recommendedIPs: networkInfo.recommendedIPs,
                };
                await Clipboard.copy(JSON.stringify(exportData, null, 2));
                showHUD("Exported to clipboard");
              }}
            />
          </ActionPanel>
        }
      />,
    );
  };

  const generateDetailMarkdown = (info: NetworkInfo): string => {
    return `# Network Analysis Report

## Network Information
- **Local IP**: ${info.localIP}
- **Subnet**: ${info.subnet}
- **Devices Found**: ${info.devices.length}
- **Recommended IPs**: ${info.recommendedIPs.length}
${info.lastScanTime ? `- **Last Scan**: ${info.lastScanTime.toLocaleString()}` : ""}

## Network Devices
${
  info.devices.length > 0
    ? info.devices
        .map(
          (device) => `### ${device.ip}
- **MAC Address**: ${device.mac || "Unknown"}
- **Hostname**: ${device.hostname || "Unknown"}
- **Manufacturer**: ${device.manufacturer || "Unknown"}
- **Open Ports**: ${device.openPorts && device.openPorts.length > 0 ? device.openPorts.map((port) => `${port} (${getPortService(port)})`).join(", ") : "None detected"}
- **Status**: Online
- **Last Seen**: ${device.lastSeen.toLocaleString()}
`,
        )
        .join("\n")
    : "No devices found"
}

## Recommended Available IPs
${
  info.recommendedIPs.length > 0
    ? info.recommendedIPs.map((ip, index) => `${index + 1}. ${ip}`).join("\n")
    : "No available IPs found"
}

---
*Generated by IP Finder*`;
  };

  const clearHistory = async () => {
    const confirmed = await confirmAlert({
      title: "Clear Scan History",
      message: "Are you sure you want to clear all scan history?",
      primaryAction: {
        title: "Clear History",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      setScanHistory([]);
      await LocalStorage.removeItem("scanHistory");
      showHUD("Scan history cleared");
    }
  };

  if (isLoading) {
    return (
      <List isLoading={true}>
        <List.Item title="Initializing..." icon={Icon.Network} />
      </List>
    );
  }

  if (!networkInfo) {
    return (
      <List>
        <List.Item
          title="Network Information Unavailable"
          subtitle="Failed to detect network configuration"
          icon={Icon.ExclamationMark}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={networkInfo.isScanning}
      searchBarPlaceholder="Search IP addresses..."
    >
      <List.Section title="Network Information">
        <List.Item
          title="Local IP Address"
          subtitle={networkInfo.localIP}
          icon={Icon.Desktop}
          accessories={[{ text: "Your Device", icon: Icon.Person }]}
        />
        <List.Item
          title="Network Subnet"
          subtitle={networkInfo.subnet}
          icon={Icon.Network}
          accessories={[{ text: "Scan Range", icon: Icon.Gear }]}
        />
        {networkInfo.lastScanTime && (
          <List.Item
            title="Last Scan"
            subtitle={networkInfo.lastScanTime.toLocaleString()}
            icon={Icon.Clock}
            accessories={[
              {
                text: `${networkInfo.assignedIPs.length} found`,
                icon: Icon.Check,
              },
            ]}
          />
        )}
      </List.Section>

      <List.Section title="Scan Controls">
        <List.Item
          title={
            networkInfo.isScanning
              ? "Scanning Network..."
              : "Start Network Scan"
          }
          subtitle={
            networkInfo.isScanning
              ? preferences.showProgressBar
                ? `Progress: ${networkInfo.scanProgress}%`
                : "Scanning..."
              : "Detect assigned IPs and get recommendations"
          }
          icon={networkInfo.isScanning ? Icon.Clock : Icon.Play}
          accessories={[
            {
              text: networkInfo.isScanning ? "In Progress" : "Ready",
              icon: networkInfo.isScanning ? Icon.Clock : Icon.Check,
            },
          ]}
          actions={
            <ActionPanel>
              {!networkInfo.isScanning && (
                <Action
                  title="Start Scan"
                  icon={Icon.Play}
                  onAction={handleScan}
                />
              )}
              <Action
                title="View Details"
                icon={Icon.Document}
                onAction={showDetails}
              />
              <Action.CopyToClipboard
                title="Copy Local Ip"
                content={networkInfo.localIP}
              />
              <Action.CopyToClipboard
                title="Copy Subnet"
                content={networkInfo.subnet}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="Custom Network Scan"
          subtitle="Scan a specific subnet or IP range"
          icon={Icon.Gear}
          accessories={[{ text: "Custom", icon: Icon.Pencil }]}
          actions={
            <ActionPanel>
              <Action
                title="Configure Custom Scan"
                icon={Icon.Gear}
                onAction={showScanForm}
              />
              <Action.CopyToClipboard
                title="Copy Local Ip"
                content={networkInfo.localIP}
              />
            </ActionPanel>
          }
        />
        {scanHistory.length > 0 && (
          <List.Item
            title="Scan History"
            subtitle={`${scanHistory.length} previous scans`}
            icon={Icon.Clock}
            accessories={[{ text: "History", icon: Icon.List }]}
            actions={
              <ActionPanel>
                <Action
                  title="View History"
                  icon={Icon.Clock}
                  onAction={() => setShowHistory(!showHistory)}
                />
                <Action
                  title="Clear History"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  onAction={clearHistory}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>

      {showHistory && scanHistory.length > 0 && (
        <List.Section title="Scan History">
          {scanHistory.map((item, index) => (
            <List.Item
              key={index}
              title={item.subnet}
              subtitle={`${item.assignedCount} assigned, ${item.recommendedCount} recommended`}
              icon={Icon.Clock}
              accessories={[
                {
                  text: item.timestamp.toLocaleDateString(),
                  icon: Icon.Calendar,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title="Scan This Subnet"
                    icon={Icon.Play}
                    onAction={() => {
                      setNetworkInfo((prev) =>
                        prev
                          ? {
                              ...prev,
                              subnet: item.subnet,
                              assignedIPs: [],
                              recommendedIPs: [],
                              isScanning: false,
                              scanProgress: 0,
                            }
                          : null,
                      );
                      const timeout =
                        parseFloat(preferences.defaultTimeout) || 1.0;
                      const maxThreads =
                        parseInt(preferences.defaultMaxThreads) || 50;
                      scanNetwork(item.subnet, timeout, maxThreads);
                    }}
                  />
                  <Action.CopyToClipboard
                    title="Copy Subnet"
                    content={item.subnet}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {networkInfo.devices.length > 0 && (
        <List.Section title="Network Devices">
          {networkInfo.devices.map((device) => (
            <List.Item
              key={device.ip}
              title={device.ip}
              subtitle={
                device.hostname || device.manufacturer || "Unknown device"
              }
              icon={Icon.Circle}
              accessories={[
                { text: "Active", icon: Icon.Check },
                device.mac
                  ? { text: device.mac, icon: Icon.Network }
                  : undefined,
                device.openPorts && device.openPorts.length > 0
                  ? {
                      text: device.openPorts
                        .map((port) => `${port} (${getPortService(port)})`)
                        .join(", "),
                      icon: Icon.Gear,
                    }
                  : undefined,
              ].filter(Boolean)}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Ip Address"
                    content={device.ip}
                  />
                  <Action.CopyToClipboard
                    title="Copy Device Info"
                    content={`IP: ${device.ip}\nMAC: ${device.mac || "Unknown"}\nHostname: ${device.hostname || "Unknown"}\nManufacturer: ${device.manufacturer || "Unknown"}\nOpen Ports: ${device.openPorts && device.openPorts.length > 0 ? device.openPorts.map((port) => `${port} (${getPortService(port)})`).join(", ") : "None detected"}`}
                  />
                  <Action.OpenInBrowser
                    title="Open in Browser"
                    url={`http://${device.ip}`}
                  />
                  <Action
                    title="Scan This Ip Range"
                    icon={Icon.MagnifyingGlass}
                    onAction={() => {
                      const ipRange =
                        device.ip.split(".").slice(0, 3).join(".") + ".0/24";
                      setNetworkInfo((prev) =>
                        prev
                          ? {
                              ...prev,
                              subnet: ipRange,
                              assignedIPs: [],
                              recommendedIPs: [],
                              devices: [],
                              isScanning: false,
                              scanProgress: 0,
                            }
                          : null,
                      );
                      const timeout =
                        parseFloat(preferences.defaultTimeout) || 1.0;
                      const maxThreads =
                        parseInt(preferences.defaultMaxThreads) || 50;
                      scanNetwork(ipRange, timeout, maxThreads);
                    }}
                  />
                  <Action
                    title="Ping Ip"
                    icon={Icon.Network}
                    onAction={async () => {
                      try {
                        const command = getPingCommand(device.ip, 2);
                        await execAsync(command);
                        showHUD(`Ping successful: ${device.ip}`);
                      } catch (error) {
                        showHUD(`Ping failed: ${device.ip}`);
                      }
                    }}
                  />
                  <Action
                    title="Scan Ports"
                    icon={Icon.Gear}
                    onAction={async () => {
                      try {
                        showToast({
                          style: Toast.Style.Animated,
                          title: "Scanning Ports",
                          message: `Checking ports on ${device.ip}...`,
                        });
                        const openPorts = await scanPorts(device.ip, []);
                        const portServices = openPorts.map(
                          (port) => `${port} (${getPortService(port)})`,
                        );
                        if (openPorts.length > 0) {
                          showHUD(
                            `Found ${openPorts.length} open ports: ${portServices.join(", ")}`,
                          );
                        } else {
                          showHUD(`No open ports found on ${device.ip}`);
                        }
                      } catch (error) {
                        showHUD(`Port scan failed: ${device.ip}`);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {networkInfo.recommendedIPs.length > 0 && (
        <List.Section title="Recommended Available IPs">
          {networkInfo.recommendedIPs.map((ip, index) => (
            <List.Item
              key={ip}
              title={ip}
              subtitle={`Recommendation #${index + 1}`}
              icon={Icon.Star}
              accessories={[{ text: "Available", icon: Icon.Circle }]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Ip Address"
                    content={ip}
                  />
                  <Action.CopyToClipboard
                    title="Copy as Static Ip"
                    content={`IP Address: ${ip}\nSubnet Mask: 255.255.255.0\nGateway: ${networkInfo.localIP.split(".").slice(0, 3).join(".")}.1`}
                  />
                  <Action
                    title="Test Ip Availability"
                    icon={Icon.MagnifyingGlass}
                    onAction={async () => {
                      try {
                        const command = getPingCommand(ip, 1);
                        await execAsync(command);
                        showHUD(`IP ${ip} is NOT available (ping successful)`);
                      } catch (error) {
                        showHUD(`IP ${ip} is available (ping failed)`);
                      }
                    }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {networkInfo.assignedIPs.length === 0 &&
        networkInfo.recommendedIPs.length === 0 &&
        !networkInfo.isScanning && (
          <List.Section title="No Scan Results">
            <List.Item
              title="No scan performed yet"
              subtitle="Click 'Start Network Scan' to begin"
              icon={Icon.Info}
            />
          </List.Section>
        )}
    </List>
  );
}
