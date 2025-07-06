// @ts-nocheck
import React, { useState, useEffect } from "react";
import {
  Action,
  ActionPanel,
  Detail,
  Form,
  Icon,
  useNavigation,
  showToast,
  Toast,
  LaunchProps,
  List,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { domainAnalyzerAPI } from "./lib/api";
import { DomainAnalysis } from "./types";

interface Arguments {
  domain: string;
}

export default function AnalyzeDomain(
  props: LaunchProps<{ arguments: Arguments }>,
) {
  const { domain: initialDomain } = props.arguments || {};
  const [domain, setDomain] = useState(initialDomain || "");
  const [showAnalysis, setShowAnalysis] = useState(!!initialDomain);
  const { push } = useNavigation();

  useEffect(() => {
    if (initialDomain) {
      setDomain(initialDomain);
      setShowAnalysis(true);
    }
  }, [initialDomain]);

  const handleDomainSubmit = (values: { domain: string }) => {
    if (values.domain) {
      setDomain(values.domain);
      setShowAnalysis(true);
      push(<DomainAnalysisView domain={values.domain} />);
    }
  };

  if (showAnalysis && domain) {
    return <DomainAnalysisView domain={domain} />;
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Analyze Domain"
            icon={Icon.MagnifyingGlass}
            onSubmit={handleDomainSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="domain"
        title="Domain"
        placeholder="example.com"
        defaultValue={domain}
        info="Enter the domain you want to analyze (without http:// or https://)"
      />
    </Form>
  );
}

function DomainAnalysisView({ domain }: { domain: string }) {
  const { push } = useNavigation();
  const [analysis, setAnalysis] = useState<DomainAnalysis>({
    domain,
    loading: {
      dns: true,
      ping: true,
      status: true,
      whois: true,
      ip_info: true,
      technologies: true,
    },
    errors: {},
  });

  useEffect(() => {
    // Execute all queries in parallel
    const runAnalysis = async () => {
      const promises = [
        domainAnalyzerAPI.getDNSInfo(domain).then(
          (dns) =>
            setAnalysis((prev) => ({
              ...prev,
              dns,
              loading: { ...prev.loading, dns: false },
            })),
          (error) =>
            setAnalysis((prev) => ({
              ...prev,
              loading: { ...prev.loading, dns: false },
              errors: { ...prev.errors, dns: error.message },
            })),
        ),
        domainAnalyzerAPI.getPingInfo(domain).then(
          (ping) =>
            setAnalysis((prev) => ({
              ...prev,
              ping,
              loading: { ...prev.loading, ping: false },
            })),
          (error) =>
            setAnalysis((prev) => ({
              ...prev,
              loading: { ...prev.loading, ping: false },
              errors: { ...prev.errors, ping: error.message },
            })),
        ),
        domainAnalyzerAPI.getDomainStatus(domain).then(
          (status) =>
            setAnalysis((prev) => ({
              ...prev,
              status,
              loading: { ...prev.loading, status: false },
            })),
          (error) =>
            setAnalysis((prev) => ({
              ...prev,
              loading: { ...prev.loading, status: false },
              errors: { ...prev.errors, status: error.message },
            })),
        ),
        domainAnalyzerAPI.getWhoisInfo(domain).then(
          (whois) =>
            setAnalysis((prev) => ({
              ...prev,
              whois,
              loading: { ...prev.loading, whois: false },
            })),
          (error) =>
            setAnalysis((prev) => ({
              ...prev,
              loading: { ...prev.loading, whois: false },
              errors: { ...prev.errors, whois: error.message },
            })),
        ),
        domainAnalyzerAPI.getIPInfo(domain).then(
          (ip_info) =>
            setAnalysis((prev) => ({
              ...prev,
              ip_info,
              loading: { ...prev.loading, ip_info: false },
            })),
          (error) =>
            setAnalysis((prev) => ({
              ...prev,
              loading: { ...prev.loading, ip_info: false },
              errors: { ...prev.errors, ip_info: error.message },
            })),
        ),
        domainAnalyzerAPI.getTechnologyInfo(domain).then(
          (technologies) =>
            setAnalysis((prev) => ({
              ...prev,
              technologies,
              loading: { ...prev.loading, technologies: false },
            })),
          (error) =>
            setAnalysis((prev) => ({
              ...prev,
              loading: { ...prev.loading, technologies: false },
              errors: { ...prev.errors, technologies: error.message },
            })),
        ),
      ];

      await Promise.allSettled(promises);
    };

    runAnalysis();
  }, [domain]);

  // Function to get status icon
  const getStatusIcon = (section: string) => {
    if (analysis.loading[section]) {
      return Icon.Clock; // Yellow for loading
    }
    if (analysis.errors[section]) {
      return Icon.XMarkCircle; // Red for error
    }
    return Icon.CheckCircle; // Green for completed
  };

  // Function to get icon color
  const getStatusColor = (section: string) => {
    if (analysis.loading[section]) {
      return "#F59E0B"; // Yellow
    }
    if (analysis.errors[section]) {
      return "#EF4444"; // Red
    }
    return "#10B981"; // Green
  };

  const isLoading = Object.values(analysis.loading).some((loading) => loading);

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`📊 Analysis of ${domain}`}
      searchBarPlaceholder="Select section..."
    >
      <List.Section title="🌐 General Information">
        <List.Item
          title="DNS Information"
          subtitle={
            analysis.dns
              ? `${analysis.dns.A.length} A records found`
              : "Loading..."
          }
          icon={{
            source: getStatusIcon("dns"),
            tintColor: getStatusColor("dns"),
          }}
          actions={
            <ActionPanel>
              <Action
                title="View Dns Details"
                icon={Icon.List}
                onAction={() => push(<DNSDetailView analysis={analysis} />)}
              />
              <Action
                title="Analyze New Domain"
                icon={Icon.Plus}
                onAction={() => push(<AnalyzeDomain />)}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Connectivity (Ping)"
          subtitle={
            analysis.ping
              ? analysis.ping.alive
                ? `🟢 Responds - ${analysis.ping.avg?.toFixed(1)}ms average`
                : "🔴 No response"
              : "Checking..."
          }
          icon={{
            source: getStatusIcon("ping"),
            tintColor: getStatusColor("ping"),
          }}
          actions={
            <ActionPanel>
              <Action
                title="View Ping Details"
                icon={Icon.Signal3}
                onAction={() => push(<PingDetailView analysis={analysis} />)}
              />
              <Action
                title="Analyze New Domain"
                icon={Icon.Plus}
                onAction={() => push(<AnalyzeDomain />)}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Website Status"
          subtitle={
            analysis.status
              ? analysis.status.online
                ? `🟢 Online - HTTP ${analysis.status.status_code}`
                : "🔴 Offline"
              : "Checking..."
          }
          icon={{
            source: getStatusIcon("status"),
            tintColor: getStatusColor("status"),
          }}
          actions={
            <ActionPanel>
              <Action
                title="View Detailed Status"
                icon={Icon.Monitor}
                onAction={() => push(<StatusDetailView analysis={analysis} />)}
              />
              <Action
                title="Analyze New Domain"
                icon={Icon.Plus}
                onAction={() => push(<AnalyzeDomain />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="📋 Registration Information">
        <List.Item
          title="Whois Information"
          subtitle={
            analysis.whois
              ? analysis.whois.registrar
                ? `📝 Registered with ${analysis.whois.registrar}`
                : "📝 Limited information"
              : "Querying..."
          }
          icon={{
            source: getStatusIcon("whois"),
            tintColor: getStatusColor("whois"),
          }}
          actions={
            <ActionPanel>
              <Action
                title="View Complete Whois"
                icon={Icon.Document}
                onAction={() => push(<WhoisDetailView analysis={analysis} />)}
              />
              <Action
                title="Analyze New Domain"
                icon={Icon.Plus}
                onAction={() => push(<AnalyzeDomain />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="🔧 Technical Information">
        <List.Item
          title="Geographic/IP Information"
          subtitle={
            analysis.ip_info
              ? analysis.ip_info.country
                ? `🌍 ${analysis.ip_info.ip} - ${analysis.ip_info.country}`
                : "🌍 Limited information"
              : "Querying..."
          }
          icon={{
            source: getStatusIcon("ip_info"),
            tintColor: getStatusColor("ip_info"),
          }}
          actions={
            <ActionPanel>
              <Action
                title="View Ip Information"
                icon={Icon.Globe}
                onAction={() => push(<IPDetailView analysis={analysis} />)}
              />
              <Action
                title="Analyze New Domain"
                icon={Icon.Plus}
                onAction={() => push(<AnalyzeDomain />)}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Detected Technologies"
          subtitle={
            analysis.technologies
              ? analysis.technologies.technologies.length > 0
                ? `⚡ ${analysis.technologies.technologies.length} technologies detected`
                : "⚡ No technologies detected"
              : "Analyzing..."
          }
          icon={{
            source: getStatusIcon("technologies"),
            tintColor: getStatusColor("technologies"),
          }}
          actions={
            <ActionPanel>
              <Action
                title="View Technologies"
                icon={Icon.Code}
                onAction={() =>
                  push(<TechnologiesDetailView analysis={analysis} />)
                }
              />
              <Action
                title="Analyze New Domain"
                icon={Icon.Plus}
                onAction={() => push(<AnalyzeDomain />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>

      <List.Section title="🚀 Actions">
        <List.Item
          title="Analyze New Domain"
          subtitle="Enter another domain to analyze"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action
                title="New Analysis"
                icon={Icon.Plus}
                onAction={() => push(<AnalyzeDomain />)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// Detail components for each section
function DNSDetailView({ analysis }: { analysis: DomainAnalysis }) {
  const dnsInfo = analysis.dns;

  if (!dnsInfo) {
    return <Detail markdown="No DNS information available" />;
  }

  const markdown = `
# 🌐 DNS Information - ${analysis.domain}

${analysis.dns?.parent ? `**Parent domain:** ${analysis.dns.parent}\n` : ""}

## 📍 A Records (IPv4)
${
  dnsInfo.A.length > 0
    ? dnsInfo.A.map((record) => `- ${record.value}`).join("\n")
    : "_No A records found_"
}

## 📍 AAAA Records (IPv6)
${
  dnsInfo.AAAA.length > 0
    ? dnsInfo.AAAA.map((record) => `- ${record.value}`).join("\n")
    : "_No AAAA records found_"
}

## 📧 MX Records (Mail Exchange)
${
  dnsInfo.MX.length > 0
    ? dnsInfo.MX.map((record) => `- ${record.value}`).join("\n")
    : "_No MX records found_"
}

## 🏢 NS Records (Name Servers)
${
  dnsInfo.NS.length > 0
    ? dnsInfo.NS.map((record) => `- ${record.value}`).join("\n")
    : "_No NS records found_"
}

## 📝 TXT Records
${
  dnsInfo.TXT.length > 0
    ? dnsInfo.TXT.map((record) => `- ${record.value}`).join("\n")
    : "_No TXT records found_"
}

## ⚙️ SOA Records (Start of Authority)
${
  dnsInfo.SOA.length > 0
    ? dnsInfo.SOA.map((record) => `- ${record.value}`).join("\n")
    : "_No SOA records found_"
}

## 🔗 CNAME Records
${
  dnsInfo.CNAME.length > 0
    ? dnsInfo.CNAME.map((record) => `- ${record.value}`).join("\n")
    : "_No CNAME records found_"
}

---
*Information obtained through standard DNS queries*  
- Powered by [NebulaCloud](https://nebulacloud.es)
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`DNS - ${analysis.domain}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Dns Information"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function PingDetailView({ analysis }: { analysis: DomainAnalysis }) {
  const ping = analysis.ping;

  if (!ping) {
    return <Detail markdown="No ping information available" />;
  }

  const markdown = `
# 🏓 Ping - ${analysis.domain}

## Connectivity Status
**Status:** ${ping.alive ? "🟢 Online" : "🔴 Offline"}

${
  ping.alive
    ? `
## Latency Statistics
| Metric | Value |
|---------|--------|
| **Minimum time** | ${ping.min?.toFixed(1) || "N/A"} ms |
| **Average time** | ${ping.avg?.toFixed(1) || "N/A"} ms |
| **Maximum time** | ${ping.max?.toFixed(1) || "N/A"} ms |
| **Packet loss** | ${ping.loss || 0}% |

## Interpretation
${
  ping.avg
    ? ping.avg < 50
      ? "🚀 **Excellent** - Very low latency"
      : ping.avg < 100
        ? "✅ **Good** - Acceptable latency"
        : ping.avg < 200
          ? "⚠️ **Fair** - High latency"
          : "🐌 **Slow** - Very high latency"
    : ""
}
`
    : `
## Error
${ping.error ? `❌ ${ping.error}` : "Could not establish connection"}
`
}

---
*Ping performed with 4 ICMP packets*  
- Powered by [NebulaCloud](https://nebulacloud.es)
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Ping - ${analysis.domain}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Ping Results"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function StatusDetailView({ analysis }: { analysis: DomainAnalysis }) {
  const status = analysis.status;

  if (!status) {
    return <Detail markdown="No status information available" />;
  }

  const markdown = `
# 🌐 Website Status - ${analysis.domain}

## General Status
**Status:** ${status.online ? "🟢 Online" : "🔴 Offline"}

${
  status.online
    ? `
## Response Information
| Metric | Value |
|---------|--------|
| **HTTP status code** | ${status.status_code} |
| **Response time** | ${status.response_time} ms |

${
  status.ssl_valid !== undefined
    ? `
## SSL/TLS Information
**SSL Status:** ${status.ssl_valid ? "🔒 Valid" : "⚠️ Invalid or not available"}
${status.ssl_expires ? `**Expires:** ${status.ssl_expires}` : ""}
`
    : ""
}

${
  status.screenshot_url
    ? `
## Screenshot
![Site screenshot](${status.screenshot_url})
`
    : ""
}

## Status Code Interpretation
${
  status.status_code
    ? status.status_code >= 200 && status.status_code < 300
      ? "✅ **Success** - Site responds correctly"
      : status.status_code >= 300 && status.status_code < 400
        ? "↗️ **Redirection** - Site redirects to another URL"
        : status.status_code >= 400 && status.status_code < 500
          ? "❌ **Client error** - Problem with the request"
          : "🔥 **Server error** - Problem on the server"
    : ""
}
`
    : `
## Error
${status.error ? `❌ ${status.error}` : "Could not access the website"}
`
}

---
*Verification performed via HTTP HEAD request*  
- Powered by [NebulaCloud](https://nebulacloud.es)
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Status - ${analysis.domain}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Site Status"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {status.online && (
            <Action.OpenInBrowser
              title="Open Website"
              url={
                analysis.domain.startsWith("http")
                  ? analysis.domain
                  : `https://${analysis.domain}`
              }
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function WhoisDetailView({ analysis }: { analysis: DomainAnalysis }) {
  const whois = analysis.whois;

  if (!whois) {
    return <Detail markdown="No whois information available" />;
  }

  const markdown = `
# 📄 Whois Information - ${analysis.domain}

${
  whois.error
    ? `
## Error
❌ ${whois.error}
`
    : `
## Registration Information
${whois.registrar ? `**Registrar:** ${whois.registrar}` : ""}
${whois.created_date ? `**Creation date:** ${whois.created_date}` : ""}
${whois.updated_date ? `**Last update:** ${whois.updated_date}` : ""}
${whois.expires_date ? `**Expiration date:** ${whois.expires_date}` : ""}

${
  whois.nameservers && whois.nameservers.length > 0
    ? `
## Name Servers
${whois.nameservers.map((ns) => `- ${ns}`).join("\n")}
`
    : ""
}

${
  whois.status && whois.status.length > 0
    ? `
## Domain Status
${whois.status.map((status) => `- ${status}`).join("\n")}
`
    : ""
}
`
}

---
*Information obtained through whois query*  
- Powered by [NebulaCloud](https://nebulacloud.es)
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Whois - ${analysis.domain}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Whois Information"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}

function IPDetailView({ analysis }: { analysis: DomainAnalysis }) {
  const ipInfo = analysis.ip_info;

  if (!ipInfo) {
    return <Detail markdown="No IP information available" />;
  }

  const markdown = `
# 🌍 Geographic and IP Information - ${analysis.domain}

${
  ipInfo.error
    ? `
## Error
❌ ${ipInfo.error}
`
    : `
## IP Address
**IP:** ${ipInfo.ip}
${ipInfo.reverse_dns ? `**Reverse DNS:** ${ipInfo.reverse_dns}` : "_Reverse DNS not available_"}

## Geographic Location
${ipInfo.country ? `**Country:** ${ipInfo.country} ${ipInfo.country_code ? `(${ipInfo.country_code})` : ""}` : ""}
${ipInfo.region ? `**Region:** ${ipInfo.region}` : ""}
${ipInfo.city ? `**City:** ${ipInfo.city}` : ""}
${ipInfo.timezone ? `**Timezone:** ${ipInfo.timezone}` : ""}

## Network Information
${ipInfo.isp ? `**ISP:** ${ipInfo.isp}` : ""}
${ipInfo.organization ? `**Organization:** ${ipInfo.organization}` : ""}
${ipInfo.as ? `**Autonomous System:** ${ipInfo.as}` : ""}

## Control Panels
${
  ipInfo.control_panels && ipInfo.control_panels.length > 0
    ? `The following control panels were detected:
${ipInfo.control_panels
  .map(
    (panel) =>
      `- **${panel.name}** (Port ${panel.port}) ${panel.url ? `- [Access](${panel.url})` : ""}`,
  )
  .join("\n")}`
    : "_No common control panels detected_"
}
`
}

---
*Geolocation information and control panel detection*  
- Powered by [NebulaCloud](https://nebulacloud.es)
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`IP/Geo - ${analysis.domain}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Ip Information"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {ipInfo.ip && (
            <Action.OpenInBrowser
              title="View on Map"
              url={`https://www.google.com/maps/search/${ipInfo.city || ipInfo.country || ipInfo.ip}`}
            />
          )}
        </ActionPanel>
      }
    />
  );
}

function TechnologiesDetailView({ analysis }: { analysis: DomainAnalysis }) {
  const tech = analysis.technologies;

  if (!tech) {
    return <Detail markdown="No technology information available" />;
  }

  const markdown = `
# 💻 Detected Technologies - ${analysis.domain}

${
  tech.error
    ? `
## Error
❌ ${tech.error}
`
    : `
${tech.server ? `**Web Server:** ${tech.server}` : ""}
${tech.cms ? `**CMS:** ${tech.cms}` : ""}

${
  tech.technologies.length > 0
    ? `
## Detected Technologies
${tech.technologies
  .map(
    (technology) =>
      `### ${technology.name}${technology.version ? ` v${technology.version}` : ""}
- **Category:** ${technology.category}
- **Confidence:** ${technology.confidence || "N/A"}%`,
  )
  .join("\n\n")}
`
    : "No specific technologies detected."
}

${
  tech.languages && tech.languages.length > 0
    ? `
## Programming Languages
${tech.languages.map((lang) => `- ${lang}`).join("\n")}
`
    : ""
}

${
  tech.frameworks && tech.frameworks.length > 0
    ? `
## Frameworks
${tech.frameworks.map((framework) => `- ${framework}`).join("\n")}
`
    : ""
}
`
}

---
*Analysis based on HTML inspection and HTTP headers*  
- Powered by [NebulaCloud](https://nebulacloud.es)
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Technologies - ${analysis.domain}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Technology Information"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
        </ActionPanel>
      }
    />
  );
}
