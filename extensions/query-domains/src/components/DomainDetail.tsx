import { List } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { WhoisResponse, TrafficResponse } from "../types";
import { formatRegistrationDateDetailed, formatExpiryDateDetailed, formatTrafficNumber } from "../utils";

interface DomainDetailProps {
  domain: string;
  status: "available" | "registered";
  apiKey: string;
}

export function DomainDetail({ domain, status, apiKey }: DomainDetailProps) {
  // If domain is available, show a clean "Available" message
  if (status === "available") {
    const markdown = `
# ${domain}

---

## ✅ Available

This domain is ready to be registered.

`;

    return <List.Item.Detail markdown={markdown} />;
  }

  // For registered domains, fetch detailed information
  // Fetch WHOIS data
  const {
    data: whoisData,
    isLoading: whoisLoading,
    error: whoisError,
  } = useFetch<WhoisResponse>(`https://api.query.domains/api/v1/whois?domain=${encodeURIComponent(domain)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  // Fetch Traffic data
  const {
    data: trafficData,
    isLoading: trafficLoading,
    error: trafficError,
  } = useFetch<TrafficResponse>(`https://api.query.domains/api/v1/traffic/${encodeURIComponent(domain)}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    onError: () => {
      // Silently fail for traffic data, it's not critical
    },
  });

  const isLoading = whoisLoading || trafficLoading;

  // Build markdown content
  let markdown = `# ${domain}\n\n`;

  if (isLoading) {
    markdown += `*Loading detailed information...*\n\n`;
  }

  // Domain Information Section - Only show core info with detailed dates
  if (whoisData?.parsed) {
    const { parsed } = whoisData;
    markdown += `## 📋 Domain Information\n\n`;
    markdown += `**Registered:** ${formatRegistrationDateDetailed(parsed.registered)}  \n`;
    markdown += `**Expires:** ${formatExpiryDateDetailed(parsed.expires)}\n\n`;
  } else if (whoisError && !whoisLoading) {
    markdown += `## 📋 Domain Information\n\n`;
    markdown += `*Failed to load WHOIS data. This domain may not support WHOIS queries or the data is unavailable.*\n\n`;
  }

  // Traffic Section
  if (trafficData?.data?.traffic) {
    const traffic = trafficData.data.traffic;
    const entries = Object.entries(traffic).sort(([a], [b]) => b.localeCompare(a));

    if (entries.length > 0) {
      markdown += `## 📊 Traffic (Last ${entries.length} months)\n\n`;

      // Table of values with K/M/B formatting
      markdown += `| Month | Visits |\n`;
      markdown += `|---|---|\n`;
      entries.slice(0, 6).forEach(([date, visits]) => {
        const monthYear = new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "short" });
        markdown += `| ${monthYear} | ${formatTrafficNumber(visits)} |\n`;
      });
      markdown += `\n`;
    }
  } else if (trafficError && !trafficLoading) {
    markdown += `## 📊 Traffic\n\n*No traffic data available for this domain.*\n\n`;
  }

  return <List.Item.Detail markdown={markdown} />;
}
