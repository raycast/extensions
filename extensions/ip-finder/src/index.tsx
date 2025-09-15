// Copyright © 2025 Swayam Mehta
// All rights reserved.

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

// Remove this interface - it's auto-generated in raycast-env.d.ts

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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [scanHistory, setScanHistory] = useState<ScanHistory[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const preferences = getPreferenceValues<Preferences>();
  const { push, pop } = useNavigation();

  const currentTheme = "auto";
  const colorScheme = "blue";
  const mapLayout = "hierarchical";
  const shouldShowMap = true;

  const effectiveTheme = currentTheme;

  useEffect(() => {
    initializeNetwork();
    loadScanHistory();
  }, []);

  const initializeNetwork = async (): Promise<void> => {
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

  const loadScanHistory = async (): Promise<void> => {
    try {
      const history = await LocalStorage.getItem<string>("scanHistory");
      if (history) {
        const parsed = JSON.parse(history) as Array<{
          subnet: string;
          timestamp: string;
          assignedCount: number;
          recommendedCount: number;
        }>;
        setScanHistory(
          parsed.map((item) => ({
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
  ): Promise<void> => {
    try {
      const newHistory: ScanHistory[] = [
        {
          subnet,
          timestamp: new Date(),
          assignedCount,
          recommendedCount,
        },
        ...scanHistory.slice(0, 9),
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
          if (info.family === "IPv4" && !info.internal && info.address) {
            return info.address;
          }
        }
      }
    }

    return "192.168.1.1";
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
          const ipAddr = match[1];
          const mac = match[2].replace(/-/g, ":").toUpperCase();
          arpMap.set(ipAddr, mac);
        }
      }
    } catch (error) {
      console.error("Failed to get ARP table:", error);
    }
    return arpMap;
  };

  const getHostname = async (ip: string): Promise<string | undefined> => {
    try {
      const hostnamePromise = dns.reverse(ip) as unknown as Promise<string[]>;
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("DNS timeout")), 2000),
      );

      const result = (await Promise.race([
        hostnamePromise,
        timeoutPromise,
      ])) as string[];
      return result && result.length > 0 ? result[0] : undefined;
    } catch {
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

    const commonPorts =
      ports.length > 0
        ? ports
        : [21, 22, 23, 25, 53, 80, 110, 143, 443, 993, 995, 8080, 8443];

    for (const port of commonPorts) {
      try {
        let command = "";
        let success = false;

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
        } catch {
          if (!isWindows) {
            try {
              command = `timeout 2 bash -c "</dev/tcp/${ip}/${port}"`;
              await execAsync(command, { timeout: 2000 });
              success = true;
            } catch {
              // ignore
            }
          }
        }

        if (success) {
          openPorts.push(port);
        }
      } catch {
        // ignore
      }
    }

    return openPorts;
  };

  const getPingCommand = (ip: string, timeout: number): string => {
    const isWindows = platform() === "win32";
    return isWindows
      ? `ping -n 1 -w ${timeout * 1000} ${ip}`
      : `ping -c 1 -W ${timeout} ${ip}`;
  };

  const isPingSuccessful = (stdout: string): boolean => {
    const isWindows = platform() === "win32";
    return isWindows
      ? stdout.includes("Reply from") && !stdout.includes("Request timed out")
      : stdout.includes("1 packets transmitted, 1 received") ||
          stdout.includes("1 received") ||
          stdout.includes("bytes from") ||
          stdout.includes("time=");
  };

  const validateSubnet = (subnet: string): boolean => {
    const subnetRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
    if (!subnetRegex.test(subnet)) return false;

    const parts = subnet.split("/");
    if (parts.length !== 2) return false;

    const ip = parts[0];
    const mask = parseInt(parts[1] || "0", 10);

    if (!ip || Number.isNaN(mask) || mask < 1 || mask > 32) return false;

    const ipParts = ip.split(".").map((p) => Number(p));
    if (ipParts.length !== 4) return false;

    return ipParts.every(
      (part) => !Number.isNaN(part) && part >= 0 && part <= 255,
    );
  };

  const scanNetworkWithRecommendations = async (
    subnet: string,
    timeout: number,
    maxThreads: number,
    recommendations: number,
  ): Promise<void> => {
    if (!networkInfo) return;

    setNetworkInfo((prev: NetworkInfo | null) =>
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
      const mask = parseInt(networkParts[1] || "0", 10);

      if (!baseIP || Number.isNaN(mask)) {
        throw new Error("Invalid subnet format");
      }

      let totalIPs = Math.pow(2, 32 - mask) - 2;
      const baseParts = baseIP.split(".").map((p) => Number(p));

      if (preferences.scanCommonRanges) {
        totalIPs = Math.min(totalIPs, 254);
      }

      const chunkSize = Math.min(maxThreads, 50);
      const chunks = Math.ceil(totalIPs / chunkSize);

      for (let chunk = 0; chunk < chunks; chunk++) {
        const promises: Array<Promise<void>> = [];

        for (let i = 0; i < chunkSize; i++) {
          const ipIndex = chunk * chunkSize + i;
          if (ipIndex >= totalIPs) break;

          const ipAddr = calculateIP(baseParts, ipIndex);
          promises.push(pingIP(ipAddr, timeout, assignedIPs));
        }

        await Promise.all(promises);

        if (preferences.showProgressBar) {
          const progress = Math.round(((chunk + 1) / chunks) * 100);
          setNetworkInfo((prev: NetworkInfo | null) =>
            prev ? { ...prev, scanProgress: progress } : null,
          );
        }
      }

      if (preferences.gatherDeviceInfo && assignedIPs.length > 0) {
        showToast({
          style: Toast.Style.Animated,
          title: "Gathering Device Info",
          message: preferences.scanPorts
            ? "Getting MAC addresses, hostnames, and scanning ports..."
            : "Getting MAC addresses and hostnames...",
        });

        const arpTable = await getARPTable();

        const devicePromises = assignedIPs.map(async (ipAddr) => {
          const mac = arpTable.get(ipAddr);

          const [hostname, openPorts] = await Promise.all([
            getHostname(ipAddr),
            preferences.scanPorts
              ? scanPorts(ipAddr, [])
              : Promise.resolve<number[]>([]),
          ]);

          return {
            ip: ipAddr,
            mac,
            manufacturer: undefined,
            hostname,
            openPorts: openPorts.length > 0 ? openPorts : undefined,
            isOnline: true,
            lastSeen: new Date(),
          } as DeviceInfo;
        });

        const deviceResults = await Promise.allSettled(devicePromises);
        devices.push(
          ...deviceResults
            .filter(
              (result): result is PromiseFulfilledResult<DeviceInfo> =>
                result.status === "fulfilled",
            )
            .map((result) => result.value),
        );
      } else {
        devices.push(
          ...assignedIPs.map((ipAddr) => ({
            ip: ipAddr,
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

      setNetworkInfo((prev: NetworkInfo | null) =>
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
      setNetworkInfo((prev: NetworkInfo | null) =>
        prev ? { ...prev, isScanning: false } : null,
      );
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
          ip[i - 1]!++;
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
    } catch {
      // not reachable
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

    const baseParts = baseIP.split(".").map((p) => Number(p));
    const recommendations: string[] = [];

    for (let i = 1; i <= 254 && recommendations.length < count; i++) {
      const ipAddr = calculateIP(baseParts, i - 1);
      if (!assignedIPs.includes(ipAddr)) {
        recommendations.push(ipAddr);
      }
    }

    return recommendations;
  };

  const scanNetwork = async (
    subnet: string,
    timeout: number,
    maxThreads: number,
  ): Promise<void> => {
    const recommendations =
      parseInt(preferences.defaultRecommendations, 10) || 10;
    await scanNetworkWithRecommendations(
      subnet,
      timeout,
      maxThreads,
      recommendations,
    );
  };

  const handleScan = (): void => {
    if (!networkInfo) return;

    const timeout = parseFloat(preferences.defaultTimeout) || 1.0;
    const maxThreads = parseInt(preferences.defaultMaxThreads, 10) || 50;

    scanNetwork(networkInfo.subnet, timeout, maxThreads);
  };

  const handleCustomScan = (values: ScanForm): void => {
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
    const maxThreads = parseInt(values.maxThreads, 10) || 50;
    const recommendations = parseInt(values.recommendations, 10) || 10;

    setNetworkInfo((prev: NetworkInfo | null) =>
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

  const showScanForm = (): void => {
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

  const showDetails = (): void => {
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
    const themeInfo = `**Theme**: ${effectiveTheme} • **Color Scheme**: ${colorScheme} • **Map Layout**: ${mapLayout}`;

    return `# Network Analysis Report

## Network Information
- **Local IP**: ${info.localIP}
- **Subnet**: ${info.subnet}
- **Devices Found**: ${info.devices.length}
- **Recommended IPs**: ${info.recommendedIPs.length}
${info.lastScanTime ? `- **Last Scan**: ${info.lastScanTime.toLocaleString()}` : ""}
- ${themeInfo}

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

## Visual Settings
- **Current Theme**: ${effectiveTheme}
- **Color Scheme**: ${colorScheme}
- **Map Layout**: ${mapLayout}
- **Network Map**: ${shouldShowMap ? "Enabled" : "Disabled"}

---
*Generated by IP Finder with ${colorScheme} theme*`;
  };

  const clearHistory = async (): Promise<void> => {
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
        <List.Item
          title="Visual Settings"
          subtitle={`${colorScheme} theme • ${effectiveTheme} mode • ${mapLayout} layout`}
          icon={Icon.Gear}
          accessories={[{ text: "Customize", icon: Icon.Gear }]}
          actions={
            <ActionPanel>
              <Action
                title="Open Extension Preferences"
                icon={Icon.Gear}
                onAction={() => {
                  showToast({
                    style: Toast.Style.Success,
                    title: "Open Preferences",
                    message:
                      "Go to Raycast Preferences > Extensions > IP Finder to customize themes and layouts",
                  });
                }}
              />
              <Action.CopyToClipboard
                title="Copy Current Theme Info"
                content={`Theme: ${currentTheme}\nColor Scheme: ${colorScheme}\nMap Layout: ${mapLayout}\nNetwork Map: ${shouldShowMap ? "Enabled" : "Disabled"}`}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      {networkInfo.devices.length > 0 && (
        <List.Section title="Network Devices">
          {networkInfo.devices.map((device: DeviceInfo) => (
            <List.Item
              key={device.ip}
              title={device.ip}
              subtitle={
                device.hostname || device.manufacturer || "Unknown device"
              }
              icon={Icon.Circle}
              accessories={[
                { text: "Active", icon: Icon.Check },
                ...(device.mac
                  ? [{ text: device.mac, icon: Icon.Network }]
                  : []),
                ...(device.openPorts && device.openPorts.length > 0
                  ? [
                      {
                        text: device.openPorts
                          .map((p: number) => `${p} (${getPortService(p)})`)
                          .join(", "),
                        icon: Icon.Gear,
                      },
                    ]
                  : []),
              ]}
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
                      setNetworkInfo((prev: NetworkInfo | null) =>
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
                        parseInt(preferences.defaultMaxThreads, 10) || 50;
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
                      } catch {
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
                      } catch {
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
          {networkInfo.recommendedIPs.map((ip: string, index: number) => (
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
                      } catch {
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
