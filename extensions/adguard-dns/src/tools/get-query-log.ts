/**
 * Fetches DNS query logs and returns blocked domains grouped by root domain.
 * This tool shows what domains were blocked in a specified time window.
 */

import { buildApiUrl, callAdGuardAPI, QueryLogResponse } from "../utils/adguard-api";
import { getRootDomain } from "../utils/domain-helpers";

type Input = {
  /** Time window in minutes to search (default: 10) */
  minutes?: number;
};

interface BlockedDomain {
  domain: string;
  blockedAt: string;
  attempts: number;
  filterRule?: string;
}

export default async function getQueryLog(input: Input): Promise<string> {
  const minutes = input.minutes || 10;

  try {
    const now = Date.now();
    const timeFromMillis = now - minutes * 60 * 1000;
    const timeToMillis = now;

    const url = buildApiUrl(
      `/oapi/v1/query_log?time_from_millis=${timeFromMillis}&time_to_millis=${timeToMillis}&limit=1000`,
    );

    const response = await callAdGuardAPI(url);

    if (!response.ok) {
      throw new Error(`AdGuard API error: ${response.status}`);
    }

    const data = (await response.json()) as QueryLogResponse;

    // Filter for blocked domains
    const blockedItems = data.items.filter(
      (item) =>
        item.filtering_info?.filtering_status === "REQUEST_BLOCKED" ||
        item.filtering_info?.filtering_status === "RESPONSE_BLOCKED",
    );

    if (blockedItems.length === 0) {
      return `No blocked domains found in the last ${minutes} minutes.`;
    }

    // Group by domain to show unique domains
    const uniqueDomains = new Map<string, { count: number; lastSeen: string; rule?: string }>();

    for (const item of blockedItems) {
      const existing = uniqueDomains.get(item.domain);
      if (existing) {
        existing.count++;
        if (new Date(item.time_iso) > new Date(existing.lastSeen)) {
          existing.lastSeen = item.time_iso;
          existing.rule = item.filtering_info?.filter_rule;
        }
      } else {
        uniqueDomains.set(item.domain, {
          count: 1,
          lastSeen: item.time_iso,
          rule: item.filtering_info?.filter_rule,
        });
      }
    }

    const domains: BlockedDomain[] = Array.from(uniqueDomains.entries()).map(([domain, info]) => ({
      domain,
      blockedAt: info.lastSeen,
      attempts: info.count,
      filterRule: info.rule,
    }));

    // Group by root domain
    const domainsByRoot = new Map<string, BlockedDomain[]>();
    for (const domain of domains) {
      const root = getRootDomain(domain.domain);
      if (!domainsByRoot.has(root)) {
        domainsByRoot.set(root, []);
      }
      domainsByRoot.get(root)!.push(domain);
    }

    // Sort groups by most recent activity
    const sortedRoots = Array.from(domainsByRoot.entries()).sort((a, b) => {
      const aLatest = Math.max(...a[1].map((d) => new Date(d.blockedAt).getTime()));
      const bLatest = Math.max(...b[1].map((d) => new Date(d.blockedAt).getTime()));
      return bLatest - aLatest;
    });

    // Format output
    let output = `Found ${domains.length} blocked domain${domains.length !== 1 ? "s" : ""} in the last ${minutes} minutes:\n\n`;

    for (const [root, subdomains] of sortedRoots) {
      const totalAttempts = subdomains.reduce((sum, d) => sum + d.attempts, 0);
      const latestTime = subdomains.reduce(
        (latest, d) => (new Date(d.blockedAt) > new Date(latest) ? d.blockedAt : latest),
        subdomains[0].blockedAt,
      );

      output += `**${root}** (${totalAttempts} attempts, ${getTimeAgo(latestTime)})\n`;

      // Show subdomains if different from root
      const uniqueSubdomains = subdomains.filter((d) => d.domain !== root);
      if (uniqueSubdomains.length > 0) {
        for (const subdomain of uniqueSubdomains) {
          output += `  - ${subdomain.domain} (${subdomain.attempts} attempts)\n`;
        }
      }
      output += "\n";
    }

    output += `To unblock domains, use the unblock-domain tool with the root domains you want to allow.`;

    return output;
  } catch (error) {
    return `Error loading query log: ${error instanceof Error ? error.message : String(error)}`;
  }
}

function getTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins === 1) return "1 min ago";
  if (diffMins < 60) return `${diffMins} mins ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hr ago";
  if (diffHours < 24) return `${diffHours} hrs ago`;

  return date.toLocaleDateString();
}
