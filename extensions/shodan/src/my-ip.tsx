import {
  ActionPanel,
  Action,
  List,
  showToast,
  Toast,
  Icon,
  Color,
  Detail,
  open,
  launchCommand,
  LaunchType,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { ShodanAPI, ShodanHostInfo, ShodanPortInfo } from "./shodan-api";

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

export default function MyIP() {
  const [isLoading, setIsLoading] = useState(true);
  const [externalIP, setExternalIP] = useState<string | null>(null);
  const [hostInfo, setHostInfo] = useState<ShodanHostInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shodanAPI = new ShodanAPI();

  const getExternalIP = async (): Promise<string> => {
    try {
      // Try multiple IPv4-only services for reliability
      const ipServices = [
        { url: "https://ipv4.icanhazip.com", type: "text" },
        { url: "https://api.ipify.org?format=text", type: "text" },
        { url: "https://checkip.amazonaws.com", type: "text" },
        { url: "https://api.ipify.org", type: "json" },
        { url: "https://httpbin.org/ip", type: "json" },
      ];

      for (const service of ipServices) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          const response = await fetch(service.url, { signal: controller.signal });
          clearTimeout(timeoutId);

          if (response.ok) {
            if (service.type === "text") {
              const text = await response.text();
              const ip = text.trim();
              // Validate IPv4 format
              if (/^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
                return ip;
              }
            } else {
              const data = (await response.json()) as { ip?: string; origin?: string };
              let ip = "";
              if (data.ip) ip = data.ip;
              else if (data.origin) ip = data.origin.split(",")[0].trim();

              // Validate IPv4 format
              if (ip && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip)) {
                return ip;
              }
            }
          }
        } catch (err) {
          console.log(`Failed to get IP from ${service.url}:`, err);
          continue;
        }
      }
      throw new Error("All IP services failed");
    } catch (error) {
      console.error("Error getting external IP:", error);
      throw new Error("Failed to determine external IP address");
    }
  };

  const lookupMyIP = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First, get the external IP
      const ip = await getExternalIP();
      setExternalIP(ip);

      showToast({
        style: Toast.Style.Animated,
        title: "Looking up your IP",
        message: `Searching Shodan for ${ip}...`,
      });

      // Then look it up in Shodan
      const result = await shodanAPI.searchHost(ip);
      setHostInfo(result);

      if (!result) {
        showToast({
          style: Toast.Style.Failure,
          title: "IP not found in Shodan",
          message: `No information found for ${ip}`,
        });
      } else {
        showToast({
          style: Toast.Style.Success,
          title: "IP lookup successful",
          message: `Found information for ${ip}`,
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error occurred";
      setError(errorMessage);
      showToast({
        style: Toast.Style.Failure,
        title: "Lookup failed",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    lookupMyIP();
  }, []);

  const formatHostInfo = (info: ShodanHostInfo) => {
    const sections = [];

    // Header
    sections.push(`# 🌐 Your External IP Information`);
    sections.push(`---`);

    // Basic Information
    sections.push(`## 📋 Basic Information`);
    sections.push(`**IP Address:** \`${info.ip_str}\``);
    if (info.hostnames.length > 0) {
      sections.push(`**Hostnames:** ${info.hostnames.join(", ")}`);
    }
    sections.push(`**Organization:** ${info.org || "Unknown"}`);
    sections.push(`**ISP:** ${info.isp || "Unknown"}`);
    sections.push(`**Last Seen:** ${new Date(info.timestamp).toLocaleString()}`);
    sections.push(``);

    // Ports and Services
    if (info.ports && info.ports.length > 0) {
      sections.push(`## 🔌 Open Ports & Services`);
      sections.push(`**Total Open Ports:** ${info.ports.length}`);
      sections.push(``);

      // Create a map of port data for easy lookup
      const portDataMap = new Map<number, ShodanPortInfo>();
      if (info.data_array) {
        info.data_array.forEach((service) => {
          portDataMap.set(service.port, service);
        });
      }

      // Sort ports and display each with details
      const sortedPorts = [...info.ports].sort((a, b) => a - b);

      sortedPorts.forEach((port) => {
        const portData = portDataMap.get(port);
        const serviceName = getServiceName(port);

        sections.push(`### Port ${port} - ${serviceName}`);

        if (portData) {
          if (portData.product) {
            sections.push(`**Service:** ${portData.product}`);
          }
          if (portData.version) {
            sections.push(`**Version:** ${portData.version}`);
          }
          if (portData.banner) {
            const banner = portData.banner.length > 150 ? portData.banner.substring(0, 150) + "..." : portData.banner;
            sections.push(`**Banner:** \`${banner}\``);
          }
          if (portData.vulns && portData.vulns.length > 0) {
            sections.push(`**Vulnerabilities:** ${portData.vulns.join(", ")}`);
          }
          if (portData.cpe && portData.cpe.length > 0) {
            sections.push(`**CPE:** ${portData.cpe.join(", ")}`);
          }
        } else {
          // Fallback to basic service name if no detailed data
          sections.push(`**Service:** ${serviceName}`);
        }
        sections.push(``);
      });
    }

    // Location Information
    if (info.location) {
      sections.push(`## 🌍 Location`);
      sections.push(`**Country:** ${info.location.country_name} (${info.location.country_code})`);
      sections.push(`**Region:** ${info.location.region_code}`);
      sections.push(`**City:** ${info.location.city}`);
      sections.push(`**Coordinates:** ${info.location.latitude}, ${info.location.longitude}`);
      sections.push(``);
    }

    // System Information
    if (info.os || info.product) {
      sections.push(`## 💻 System Information`);
      if (info.os) sections.push(`**Operating System:** ${info.os}`);
      if (info.product) sections.push(`**Product:** ${info.product}`);
      if (info.version) sections.push(`**Version:** ${info.version}`);
      sections.push(``);
    }

    // Security Information
    if (info.vulns && info.vulns.length > 0) {
      sections.push(`## ⚠️ Security Vulnerabilities`);
      info.vulns.forEach((vuln) => {
        sections.push(`- **${vuln}**`);
      });
      sections.push(``);
    }

    // Tags
    if (info.tags && info.tags.length > 0) {
      sections.push(`## 🏷️ Tags`);
      sections.push(info.tags.map((tag) => `\`${tag}\``).join(" "));
      sections.push(``);
    }

    // CPE Information
    if (info.cpe && info.cpe.length > 0) {
      sections.push(`## 🔧 CPE (Common Platform Enumeration)`);
      info.cpe.forEach((cpe) => {
        sections.push(`- \`${cpe}\``);
      });
      sections.push(``);
    }

    // Footer
    sections.push(`---`);
    sections.push(`*Data provided by [Shodan](https://www.shodan.io/)*`);

    return sections.join("\n");
  };

  if (hostInfo) {
    return (
      <Detail
        markdown={formatHostInfo(hostInfo)}
        actions={
          <ActionPanel>
            <Action
              title="Open in Shodan"
              icon={Icon.Globe}
              onAction={() => {
                open(`https://www.shodan.io/host/${hostInfo.ip_str}`);
              }}
            />
            <Action.CopyToClipboard title="Copy IP Address" content={hostInfo.ip_str} />
            <Action.CopyToClipboard title="Copy All Information" content={formatHostInfo(hostInfo)} />
            <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={lookupMyIP} />
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
    );
  }

  return (
    <List isLoading={isLoading}>
      {error && (
        <List.Item
          title="Error"
          subtitle={error}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={lookupMyIP} />
            </ActionPanel>
          }
        />
      )}
      {!isLoading && !error && !hostInfo && externalIP && (
        <List.Item
          title="No results found"
          subtitle={`No Shodan data for ${externalIP}`}
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.SecondaryText }}
          actions={
            <ActionPanel>
              <Action title="Retry" icon={Icon.ArrowClockwise} onAction={lookupMyIP} />
            </ActionPanel>
          }
        />
      )}
      {isLoading && (
        <List.Item
          title="Detecting your IP address..."
          subtitle="Please wait while we look up your external IP"
          icon={{ source: Icon.Globe, tintColor: Color.Blue }}
        />
      )}
    </List>
  );
}
