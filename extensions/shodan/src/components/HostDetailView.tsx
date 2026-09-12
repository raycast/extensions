import { useState, useEffect, useRef } from "react";
import {
  Detail,
  ActionPanel,
  Action,
  Icon,
  Color,
  showToast,
  Toast,
} from "@raycast/api";
import { ShodanHost, ShodanSearchMatch, ShodanScreenshot } from "../api/types";
import { getPortColor } from "../utils/formatters";
import { copyHostAsJSON } from "../utils/export";
import { useShodanHost } from "../hooks/useShodanHost";
import { useHoneyscore } from "../hooks/useHoneyscore";
import { formatCVSS, sortVulnsByCVSS } from "../utils/cvss";

// Helper function for honeyscore badge
function getHoneyscoreInfo(score: number | null): {
  text: string;
  color: Color;
  isLikelyHoneypot: boolean;
} {
  if (score === null)
    return {
      text: "Unknown",
      color: Color.SecondaryText,
      isLikelyHoneypot: false,
    };

  const percentage = Math.round(score * 100);
  if (score >= 0.7) {
    return {
      text: `${percentage}% - Likely Honeypot`,
      color: Color.Red,
      isLikelyHoneypot: true,
    };
  } else if (score >= 0.4) {
    return {
      text: `${percentage}% - Possibly Honeypot`,
      color: Color.Orange,
      isLikelyHoneypot: false,
    };
  } else {
    return {
      text: `${percentage}% - Unlikely Honeypot`,
      color: Color.Green,
      isLikelyHoneypot: false,
    };
  }
}

interface HostDetailViewProps {
  ip: string;
  searchMatch?: ShodanSearchMatch;
}

// Convert country code to flag emoji
function countryCodeToFlag(countryCode: string | undefined): string {
  if (!countryCode || countryCode.length !== 2) return "";
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Extract screenshots from host data
function getScreenshots(
  host: ShodanHost | null,
): { port: number; screenshot: ShodanScreenshot }[] {
  if (!host || !host.data) return [];

  const screenshots: { port: number; screenshot: ShodanScreenshot }[] = [];

  for (const service of host.data) {
    if (service.screenshot) {
      screenshots.push({
        port: service.port,
        screenshot: service.screenshot,
      });
    }
  }

  return screenshots;
}

// Known ports that have well-known service names
const KNOWN_PORTS: Record<number, string> = {
  21: "FTP",
  22: "SSH",
  23: "Telnet",
  25: "SMTP",
  53: "DNS",
  80: "HTTP",
  110: "POP3",
  111: "RPCbind",
  119: "NNTP",
  123: "NTP",
  135: "MS RPC",
  137: "NetBIOS-NS",
  138: "NetBIOS-DGM",
  139: "NetBIOS-SSN",
  143: "IMAP",
  161: "SNMP",
  389: "LDAP",
  443: "HTTPS",
  445: "SMB",
  465: "SMTPS",
  514: "Syslog",
  515: "LPD",
  587: "SMTP Submission",
  636: "LDAPS",
  993: "IMAPS",
  995: "POP3S",
  1080: "SOCKS",
  1433: "MSSQL",
  1521: "Oracle DB",
  1723: "PPTP",
  1883: "MQTT",
  2049: "NFS",
  2181: "ZooKeeper",
  3306: "MySQL",
  3389: "RDP",
  3690: "SVN",
  4443: "HTTPS Alt",
  5000: "UPnP",
  5432: "PostgreSQL",
  5672: "AMQP",
  5900: "VNC",
  5984: "CouchDB",
  6379: "Redis",
  6443: "Kubernetes API",
  6667: "IRC",
  7001: "WebLogic",
  8000: "HTTP Alt",
  8080: "HTTP Proxy",
  8443: "HTTPS Alt",
  8883: "MQTT SSL",
  9000: "SonarQube",
  9092: "Kafka",
  9200: "Elasticsearch",
  9300: "Elasticsearch",
  9418: "Git",
  11211: "Memcached",
  27017: "MongoDB",
  27018: "MongoDB",
  50000: "SAP",
};

// Format service info line with info icon for known ports
function formatServiceLine(
  port: number,
  product?: string,
  version?: string,
  protocol?: string,
): string {
  const knownService = KNOWN_PORTS[port];
  const hasKnown = !!knownService;
  const infoIcon = hasKnown ? " ℹ️" : "";

  let line = `### \`${port}\`${infoIcon}`;

  const parts: string[] = [];
  if (product) {
    parts.push(version ? `${product} ${version}` : product);
  } else if (knownService) {
    parts.push(knownService);
  }

  if (protocol && protocol !== "tcp") {
    parts.push(`(${protocol})`);
  }

  if (parts.length > 0) {
    line += ` — ${parts.join(" ")}`;
  }

  if (
    hasKnown &&
    product &&
    product.toLowerCase() !== knownService.toLowerCase()
  ) {
    line += `\n\n> *Known service: ${knownService}*`;
  }

  return line;
}

// Generate markdown for full host data (all ports)
function generateFullHostMarkdown(host: ShodanHost): string {
  let md = "";
  const services = host.data;

  md += `## Open Ports (${services.length})\n\n`;

  if (services.length === 0) {
    md += "*No services detected*\n\n";
  } else {
    const sortedServices = [...services].sort((a, b) => a.port - b.port);

    for (const service of sortedServices) {
      md += formatServiceLine(
        service.port,
        service.product,
        service.version,
        service.protocol,
      );
      md += "\n\n";

      if (service.data && service.data.trim().length > 0) {
        const banner = service.data.trim().slice(0, 600);
        const truncated = service.data.length > 600;
        md += `\`\`\`\n${banner}${truncated ? "\n..." : ""}\n\`\`\`\n\n`;
      }

      if (service.http) {
        const httpParts: string[] = [];
        if (service.http.status)
          httpParts.push(`Status: ${service.http.status}`);
        if (service.http.server)
          httpParts.push(`Server: ${service.http.server}`);
        if (service.http.title)
          httpParts.push(`Title: "${service.http.title}"`);
        if (httpParts.length > 0) {
          md += `> ${httpParts.join(" · ")}\n\n`;
        }
      }

      if (service.ssl?.cert) {
        const cert = service.ssl.cert;
        const subject = cert.subject?.CN || cert.subject?.O || "Unknown";
        const expires = cert.expires
          ? new Date(cert.expires).toLocaleDateString()
          : "Unknown";
        md += `> 🔒 SSL: ${subject} (expires: ${expires})\n\n`;
      }

      md += "---\n\n";
    }
  }

  if (host.os) {
    md += `## System\n\n**OS:** ${host.os}\n\n`;
  }

  const vulns = host.vulns;
  if (vulns && vulns.length > 0) {
    md += `## ⚠️ Vulnerabilities (${vulns.length})\n\n`;
    md += `> **Note:** Detailed CVSS scores require individual CVE lookup. Click CVE links in actions to view details.\n\n`;
    vulns.slice(0, 25).forEach((cve) => {
      md += `- \`${cve}\` — [View on NVD](https://nvd.nist.gov/vuln/detail/${cve})\n`;
    });
    if (vulns.length > 25) {
      md += `\n*+${vulns.length - 25} more vulnerabilities*\n`;
    }
  }

  return md;
}

// Generate markdown for partial data (search match - single port)
function generatePartialMarkdown(match: ShodanSearchMatch): string {
  let md = "";

  md += `## Service (from search)\n\n`;
  md += formatServiceLine(
    match.port,
    match.product,
    match.version,
    match.transport,
  );
  md += "\n\n";

  if (match.data && match.data.trim().length > 0) {
    const banner = match.data.trim().slice(0, 1000);
    const truncated = match.data.length > 1000;
    md += `\`\`\`\n${banner}${truncated ? "\n..." : ""}\n\`\`\`\n\n`;
  }

  if (match.http) {
    const httpParts: string[] = [];
    if (match.http.status) httpParts.push(`Status: ${match.http.status}`);
    if (match.http.server) httpParts.push(`Server: ${match.http.server}`);
    if (match.http.title) httpParts.push(`Title: "${match.http.title}"`);
    if (httpParts.length > 0) {
      md += `> ${httpParts.join(" · ")}\n\n`;
    }
  }

  if (match.ssl?.cert) {
    const cert = match.ssl.cert;
    const subject = cert.subject?.CN || cert.subject?.O || "Unknown";
    const expires = cert.expires
      ? new Date(cert.expires).toLocaleDateString()
      : "Unknown";
    md += `> 🔒 SSL: ${subject} (expires: ${expires})\n\n`;
  }

  const vulns = match.vulns;
  if (vulns) {
    const sortedVulns = sortVulnsByCVSS(vulns);
    if (sortedVulns.length > 0) {
      md += `---\n\n## ⚠️ Vulnerabilities (${sortedVulns.length})\n\n`;

      // Show highest severity first
      sortedVulns.slice(0, 15).forEach(([cve, cvss]) => {
        const cvssInfo = formatCVSS(cvss);
        md += `- \`${cve}\`${cvssInfo ? ` — ${cvssInfo}` : ""}\n`;
      });

      if (sortedVulns.length > 15) {
        md += `\n*+${sortedVulns.length - 15} more vulnerabilities*\n`;
      }

      // Add severity summary
      const critical = sortedVulns.filter(
        (vuln) => vuln[1] && vuln[1] >= 9.0,
      ).length;
      const high = sortedVulns.filter(
        (vuln) => vuln[1] && vuln[1] >= 7.0 && vuln[1] < 9.0,
      ).length;
      const medium = sortedVulns.filter(
        (vuln) => vuln[1] && vuln[1] >= 4.0 && vuln[1] < 7.0,
      ).length;

      if (critical > 0 || high > 0 || medium > 0) {
        md += `\n> **Severity:** `;
        const parts = [];
        if (critical > 0) parts.push(`🔴 ${critical} Critical`);
        if (high > 0) parts.push(`🟠 ${high} High`);
        if (medium > 0) parts.push(`🟡 ${medium} Medium`);
        md += parts.join(" · ");
        md += `\n`;
      }
    }
  }

  md += `\n---\n\n> ⚡ *Press "Full Scan" to load all open ports and services*\n`;

  return md;
}

export function HostDetailView({ ip, searchMatch }: HostDetailViewProps) {
  const [enableFullScan, setEnableFullScan] = useState(false);
  const [checkHoneyscore, setCheckHoneyscore] = useState(false);
  const isMounted = useRef(true);
  const {
    host: fullHost,
    isLoading,
    error,
  } = useShodanHost({ ip, enabled: enableFullScan });

  const { score: honeyscore, isLoading: honeyscoreLoading } = useHoneyscore({
    ip,
    enabled: checkHoneyscore,
  });

  // Cancel request on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      setEnableFullScan(false); // Disable fetch on unmount
    };
  }, []);

  const handleFullScan = () => {
    if (!isMounted.current) return;
    setEnableFullScan(true);
  };

  // Show toast when full scan completes
  useEffect(() => {
    if (enableFullScan && fullHost && !isLoading) {
      showToast({
        style: Toast.Style.Success,
        title: "Host data loaded",
        message: `${fullHost.ports.length} ports found`,
      });
    } else if (enableFullScan && error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load host data",
      });
    }
  }, [enableFullScan, fullHost, isLoading, error]);

  // Determine what data to show
  const hasFullData = fullHost && !isLoading && !error;
  const host = hasFullData ? fullHost : null;
  const match = searchMatch;

  // Use full data if available, otherwise use search match data
  const location = host?.location || match?.location;
  const flag = countryCodeToFlag(location?.country_code);
  const locationParts = [
    location?.city,
    location?.region_code,
    location?.country_name,
  ].filter(Boolean);
  const locationText =
    locationParts.length > 0 ? locationParts.join(", ") : "Unknown";

  const org = host?.org || match?.org;
  const asn = host?.asn || match?.asn;
  const isp = host?.isp || match?.isp;
  const hostnames = host?.hostnames || match?.hostnames || [];
  const tags = host?.tags || match?.tags || [];

  // Ports
  const ports = host ? host.ports : match ? [match.port] : [];
  const vulnList =
    host?.vulns || (match?.vulns ? Object.keys(match.vulns) : []);

  // Get screenshots from full host data
  const screenshots = getScreenshots(host);

  // Generate markdown
  let markdown = "";
  if (hasFullData && host) {
    markdown = generateFullHostMarkdown(host);
  } else if (match) {
    markdown = generatePartialMarkdown(match);
  } else if (isLoading) {
    markdown = `# Loading...\n\nFetching full host data for \`${ip}\`...`;
  } else if (error) {
    markdown = `# Error\n\nFailed to load host data. The host may not be indexed in Shodan.`;
  } else {
    markdown = `# ${ip}\n\nPress "Full Scan" to load host data.`;
  }

  // Only show loading spinner when actively fetching and no data yet
  const showLoading = enableFullScan && isLoading && !fullHost;

  return (
    <Detail
      isLoading={showLoading}
      markdown={markdown}
      navigationTitle={ip}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="IP Address"
            text={ip}
            icon={Icon.Globe}
          />

          <Detail.Metadata.Separator />

          {location && (
            <>
              <Detail.Metadata.Label
                title="Location"
                text={`${flag} ${locationText}`}
              />
              {location.latitude && location.longitude && (
                <Detail.Metadata.Label
                  title="Coordinates"
                  text={`${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`}
                />
              )}
            </>
          )}
          {org && <Detail.Metadata.Label title="Organization" text={org} />}
          {asn && <Detail.Metadata.Label title="ASN" text={asn} />}
          {isp && isp !== org && (
            <Detail.Metadata.Label title="ISP" text={isp} />
          )}

          <Detail.Metadata.Separator />

          {hostnames.length > 0 && (
            <Detail.Metadata.TagList title="Hostnames">
              {hostnames.slice(0, 5).map((hostname: string) => (
                <Detail.Metadata.TagList.Item
                  key={hostname}
                  text={hostname}
                  color={Color.Blue}
                />
              ))}
              {hostnames.length > 5 && (
                <Detail.Metadata.TagList.Item
                  text={`+${hostnames.length - 5}`}
                  color={Color.SecondaryText}
                />
              )}
            </Detail.Metadata.TagList>
          )}

          <Detail.Metadata.TagList title={`Ports (${ports.length})`}>
            {ports.slice(0, 12).map((port: number) => (
              <Detail.Metadata.TagList.Item
                key={port}
                text={`${port}`}
                color={getPortColor(port)}
              />
            ))}
            {ports.length > 12 && (
              <Detail.Metadata.TagList.Item
                text={`+${ports.length - 12}`}
                color={Color.SecondaryText}
              />
            )}
          </Detail.Metadata.TagList>

          {vulnList.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Vulnerabilities"
                text={`${vulnList.length} CVE${vulnList.length > 1 ? "s" : ""}`}
                icon={{ source: Icon.Bug, tintColor: Color.Red }}
              />
            </>
          )}

          {tags.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.TagList title="Tags">
                {tags.map((tag: string) => (
                  <Detail.Metadata.TagList.Item
                    key={tag}
                    text={tag}
                    color={Color.Purple}
                  />
                ))}
              </Detail.Metadata.TagList>
            </>
          )}

          {checkHoneyscore && honeyscore !== null && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Honeyscore"
                text={getHoneyscoreInfo(honeyscore).text}
                icon={{
                  source: getHoneyscoreInfo(honeyscore).isLikelyHoneypot
                    ? Icon.Warning
                    : Icon.Shield,
                  tintColor: getHoneyscoreInfo(honeyscore).color,
                }}
              />
            </>
          )}

          {screenshots.length > 0 && (
            <>
              <Detail.Metadata.Separator />
              <Detail.Metadata.Label
                title="Screenshots"
                text={`${screenshots.length} available`}
                icon={Icon.Image}
              />
            </>
          )}

          <Detail.Metadata.Separator />
          <Detail.Metadata.Link
            title="Shodan"
            text="View Full Report"
            target={`https://www.shodan.io/host/${ip}`}
          />
        </Detail.Metadata>
      }
      actions={
        <ActionPanel>
          {!hasFullData && !isLoading && (
            <Action
              title="Full Scan"
              icon={Icon.Download}
              onAction={handleFullScan}
            />
          )}

          <ActionPanel.Section title="Copy">
            <Action.CopyToClipboard
              title="Copy IP Address"
              content={ip}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
            {ports.length > 0 && (
              <Action.CopyToClipboard
                title="Copy All Ports"
                content={ports.join(", ")}
              />
            )}
            {(host || match) && (
              <Action
                title="Copy as JSON"
                icon={Icon.Clipboard}
                onAction={() => copyHostAsJSON(host || match!)}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
              />
            )}
            {hostnames.length > 0 && (
              <Action.CopyToClipboard
                title="Copy Hostnames"
                content={hostnames.join("\n")}
              />
            )}
          </ActionPanel.Section>

          <ActionPanel.Section title="Open">
            <Action.OpenInBrowser
              title="View on Shodan"
              url={`https://www.shodan.io/host/${ip}`}
              shortcut={{ modifiers: ["cmd"], key: "o" }}
            />
          </ActionPanel.Section>

          <ActionPanel.Section title="Analysis">
            {!checkHoneyscore ? (
              <Action
                title="Check Honeyscore"
                icon={Icon.Shield}
                onAction={() => {
                  setCheckHoneyscore(true);
                  showToast({
                    style: Toast.Style.Animated,
                    title: "Checking honeyscore...",
                  });
                }}
                shortcut={{ modifiers: ["cmd", "shift"], key: "h" }}
              />
            ) : honeyscoreLoading ? (
              <Action title="Checking Honeyscore…" icon={Icon.Clock} />
            ) : (
              <Action
                title={`Honeyscore: ${honeyscore !== null ? Math.round(honeyscore * 100) + "%" : "N/A"}`}
                icon={Icon.Shield}
                onAction={() => {
                  if (honeyscore !== null) {
                    const info = getHoneyscoreInfo(honeyscore);
                    showToast({
                      style: Toast.Style.Success,
                      title: "Honeyscore Result",
                      message: info.text,
                    });
                  }
                }}
              />
            )}
          </ActionPanel.Section>

          {vulnList.length > 0 && (
            <ActionPanel.Section title="Lookup CVE">
              {vulnList.slice(0, 5).map((vuln: string) => (
                <Action.OpenInBrowser
                  key={vuln}
                  title={`${vuln}`}
                  url={`https://nvd.nist.gov/vuln/detail/${vuln}`}
                  icon={Icon.Bug}
                />
              ))}
            </ActionPanel.Section>
          )}
        </ActionPanel>
      }
    />
  );
}
