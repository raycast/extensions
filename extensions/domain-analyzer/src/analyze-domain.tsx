// @ts-nocheck
import React, { useState, useEffect } from "react";
import { Action, ActionPanel, Detail, Form, Icon, useNavigation, LaunchProps, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { domainAnalyzerAPI } from "./lib/api";
import { DomainAnalysis } from "./types";

interface Arguments {
  domain: string;
}

export default function AnalyzeDomain(props: LaunchProps<{ arguments: Arguments }>) {
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
          <Action.SubmitForm title="Analyze Domain" icon={Icon.MagnifyingGlass} onSubmit={handleDomainSubmit} />
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
          (error) => {
            setAnalysis((prev) => ({
              ...prev,
              loading: { ...prev.loading, dns: false },
              errors: { ...prev.errors, dns: (error as Error).message },
            }));
            showFailureToast("DNS Error", { message: (error as Error).message });
          },
        ),
        domainAnalyzerAPI.getPingInfo(domain).then(
          (ping) =>
            setAnalysis((prev) => ({
              ...prev,
              ping,
              loading: { ...prev.loading, ping: false },
            })),
          (error) => {
            setAnalysis((prev) => ({
              ...prev,
              loading: { ...prev.loading, ping: false },
              errors: { ...prev.errors, ping: (error as Error).message },
            }));
            showFailureToast("Ping Error", { message: (error as Error).message });
          },
        ),
        domainAnalyzerAPI.getDomainStatus(domain).then(
          (status) =>
            setAnalysis((prev) => ({
              ...prev,
              status,
              loading: { ...prev.loading, status: false },
            })),
          (error) => {
            setAnalysis((prev) => ({
              ...prev,
              loading: { ...prev.loading, status: false },
              errors: { ...prev.errors, status: (error as Error).message },
            }));
            showFailureToast("Status Error", { message: (error as Error).message });
          },
        ),
        domainAnalyzerAPI.getWhoisInfo(domain).then(
          (whois) =>
            setAnalysis((prev) => ({
              ...prev,
              whois,
              loading: { ...prev.loading, whois: false },
            })),
          (error) => {
            setAnalysis((prev) => ({
              ...prev,
              loading: { ...prev.loading, whois: false },
              errors: { ...prev.errors, whois: (error as Error).message },
            }));
            showFailureToast("Whois Error", { message: (error as Error).message });
          },
        ),
        domainAnalyzerAPI.getIPInfo(domain).then(
          (ip_info) =>
            setAnalysis((prev) => ({
              ...prev,
              ip_info,
              loading: { ...prev.loading, ip_info: false },
            })),
          (error) => {
            setAnalysis((prev) => ({
              ...prev,
              loading: { ...prev.loading, ip_info: false },
              errors: { ...prev.errors, ip_info: (error as Error).message },
            }));
            showFailureToast("IP Info Error", { message: (error as Error).message });
          },
        ),
        domainAnalyzerAPI.getTechnologyInfo(domain).then(
          (technologies) =>
            setAnalysis((prev) => ({
              ...prev,
              technologies,
              loading: { ...prev.loading, technologies: false },
            })),
          (error) => {
            setAnalysis((prev) => ({
              ...prev,
              loading: { ...prev.loading, technologies: false },
              errors: { ...prev.errors, technologies: (error as Error).message },
            }));
            showFailureToast("Technology Error", { message: (error as Error).message });
          },
        ),
      ];

      await Promise.allSettled(promises);
    };

    runAnalysis();
  }, [domain]);

  // Function to get status icon
  const getStatusIcon = (section: keyof typeof analysis.loading) => {
    if (analysis.loading[section]) {
      return Icon.Clock; // Yellow for loading
    }
    if (analysis.errors[section]) {
      return Icon.XMarkCircle; // Red for error
    }
    return Icon.CheckCircle; // Green for completed
  };

  // Function to get icon color
  const getStatusColor = (section: keyof typeof analysis.loading) => {
    if (analysis.loading[section]) {
      return "#F59E0B"; // Yellow
    }
    if (analysis.errors[section]) {
      return "#EF4444"; // Red
    }
    return "#10B981"; // Green
  };

  return (
    <List navigationTitle={`Analysis: ${domain}`} searchBarPlaceholder="Filter results...">
      <List.Section title="Analysis Results">
        <List.Item
          icon={{ source: getStatusIcon("dns"), tintColor: getStatusColor("dns") }}
          title="DNS Information"
          subtitle={
            analysis.loading.dns
              ? "Loading..."
              : analysis.errors.dns
                ? "Error"
                : analysis.dns
                  ? `${Object.values(analysis.dns).flat().length - 1} records found`
                  : "No data"
          }
          actions={
            <ActionPanel>
              {!analysis.loading.dns && !analysis.errors.dns && (
                <Action
                  title="View Dns Details"
                  icon={Icon.Eye}
                  onAction={() => push(<DNSDetailView analysis={analysis} />)}
                />
              )}
              <Action title="New Analysis" icon={Icon.Plus} onAction={() => push(<AnalyzeDomain />)} />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{ source: getStatusIcon("ping"), tintColor: getStatusColor("ping") }}
          title="Ping Test"
          subtitle={
            analysis.loading.ping
              ? "Loading..."
              : analysis.errors.ping
                ? "Error"
                : analysis.ping
                  ? analysis.ping.alive
                    ? `Online - ${analysis.ping.avg?.toFixed(1) || "N/A"}ms avg`
                    : "Offline"
                  : "No data"
          }
          actions={
            <ActionPanel>
              {!analysis.loading.ping && !analysis.errors.ping && (
                <Action
                  title="View Ping Details"
                  icon={Icon.Eye}
                  onAction={() => push(<PingDetailView analysis={analysis} />)}
                />
              )}
              <Action title="New Analysis" icon={Icon.Plus} onAction={() => push(<AnalyzeDomain />)} />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{ source: getStatusIcon("status"), tintColor: getStatusColor("status") }}
          title="Website Status"
          subtitle={
            analysis.loading.status
              ? "Loading..."
              : analysis.errors.status
                ? "Error"
                : analysis.status
                  ? analysis.status.online
                    ? `Online - ${analysis.status.status_code} (${analysis.status.response_time}ms)`
                    : "Offline"
                  : "No data"
          }
          actions={
            <ActionPanel>
              {!analysis.loading.status && !analysis.errors.status && (
                <Action
                  title="View Status Details"
                  icon={Icon.Eye}
                  onAction={() => push(<StatusDetailView analysis={analysis} />)}
                />
              )}
              <Action title="New Analysis" icon={Icon.Plus} onAction={() => push(<AnalyzeDomain />)} />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{ source: getStatusIcon("whois"), tintColor: getStatusColor("whois") }}
          title="Whois Information"
          subtitle={
            analysis.loading.whois
              ? "Loading..."
              : analysis.errors.whois
                ? "Error"
                : analysis.whois
                  ? analysis.whois.registrar
                    ? `Registrar: ${analysis.whois.registrar}`
                    : "Registration info available"
                  : "No data"
          }
          actions={
            <ActionPanel>
              {!analysis.loading.whois && !analysis.errors.whois && (
                <Action
                  title="View Whois Details"
                  icon={Icon.Eye}
                  onAction={() => push(<WhoisDetailView analysis={analysis} />)}
                />
              )}
              <Action title="New Analysis" icon={Icon.Plus} onAction={() => push(<AnalyzeDomain />)} />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{ source: getStatusIcon("ip_info"), tintColor: getStatusColor("ip_info") }}
          title="Geographic Information"
          subtitle={
            analysis.loading.ip_info
              ? "Loading..."
              : analysis.errors.ip_info
                ? "Error"
                : analysis.ip_info
                  ? analysis.ip_info.country
                    ? `${analysis.ip_info.city || "Unknown"}, ${analysis.ip_info.country}`
                    : `IP: ${analysis.ip_info.ip}`
                  : "No data"
          }
          actions={
            <ActionPanel>
              {!analysis.loading.ip_info && !analysis.errors.ip_info && (
                <Action
                  title="View Ip Details"
                  icon={Icon.Eye}
                  onAction={() => push(<IPDetailView analysis={analysis} />)}
                />
              )}
              <Action title="New Analysis" icon={Icon.Plus} onAction={() => push(<AnalyzeDomain />)} />
            </ActionPanel>
          }
        />

        <List.Item
          icon={{ source: getStatusIcon("technologies"), tintColor: getStatusColor("technologies") }}
          title="Technologies"
          subtitle={
            analysis.loading.technologies
              ? "Loading..."
              : analysis.errors.technologies
                ? "Error"
                : analysis.technologies
                  ? analysis.technologies.cms
                    ? `CMS: ${analysis.technologies.cms}`
                    : `${analysis.technologies.technologies.length} technologies detected`
                  : "No data"
          }
          actions={
            <ActionPanel>
              {!analysis.loading.technologies && !analysis.errors.technologies && (
                <Action
                  title="View Technology Details"
                  icon={Icon.Eye}
                  onAction={() => push(<TechnologiesDetailView analysis={analysis} />)}
                />
              )}
              <Action title="New Analysis" icon={Icon.Plus} onAction={() => push(<AnalyzeDomain />)} />
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
${dnsInfo.A.length > 0 ? dnsInfo.A.map((record) => `- ${record.value}`).join("\n") : "_No A records found_"}

## 📍 AAAA Records (IPv6)
${dnsInfo.AAAA.length > 0 ? dnsInfo.AAAA.map((record) => `- ${record.value}`).join("\n") : "_No AAAA records found_"}

## 📧 MX Records (Mail Exchange)
${dnsInfo.MX.length > 0 ? dnsInfo.MX.map((record) => `- ${record.value}`).join("\n") : "_No MX records found_"}

## 🏢 NS Records (Name Servers)
${dnsInfo.NS.length > 0 ? dnsInfo.NS.map((record) => `- ${record.value}`).join("\n") : "_No NS records found_"}

## 📝 TXT Records
${dnsInfo.TXT.length > 0 ? dnsInfo.TXT.map((record) => `- ${record.value}`).join("\n") : "_No TXT records found_"}

## ⚙️ SOA Records (Start of Authority)
${dnsInfo.SOA.length > 0 ? dnsInfo.SOA.map((record) => `- ${record.value}`).join("\n") : "_No SOA records found_"}

## 🔗 CNAME Records
${dnsInfo.CNAME.length > 0 ? dnsInfo.CNAME.map((record) => `- ${record.value}`).join("\n") : "_No CNAME records found_"}

---
*Information obtained through standard DNS queries*
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
`
    : `
## Error
${status.error ? `❌ ${status.error}` : "Website is not accessible"}
`
}

---
*Status check performed via HTTP/HTTPS request*
  `;

  return (
    <Detail
      markdown={markdown}
      navigationTitle={`Status - ${analysis.domain}`}
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            title="Copy Status Information"
            content={markdown}
            shortcut={{ modifiers: ["cmd"], key: "c" }}
          />
          {status.online && (
            <Action.OpenInBrowser
              title="Open Website"
              url={analysis.domain.startsWith("http") ? analysis.domain : `https://${analysis.domain}`}
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
`
}

---
*Geolocation information provided by third-party service*
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
