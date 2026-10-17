import { getPreferenceValues } from "@raycast/api";
import { type ClientDetails, QueryBlockStatus, type QueryLogs, type SummaryInfo, type TopQueries } from "../interfaces";
import { buildBaseURL } from "../utils";
import { fetchWithTimeout, formatTimestamp, PiholeConnectionError } from "./shared";
import type { DomainEntry, NormalizedSummary, PaginatedQueryLogs, PiholeAPI, QueryTypeBreakdown } from "./types";

export class PiholeV5 implements PiholeAPI {
  private baseURL: string;
  private token: string;

  constructor() {
    const { PIHOLE_URL, API_TOKEN } = getPreferenceValues<Preferences>();
    this.baseURL = `${buildBaseURL(PIHOLE_URL, "http")}/admin/api.php`;
    this.token = API_TOKEN;
  }

  private url(params: string): string {
    return `${this.baseURL}?${params}&auth=${this.token}`;
  }

  async getSummary(): Promise<NormalizedSummary> {
    const response = await fetchWithTimeout(this.url("summary"));
    if (!response.ok) {
      throw new PiholeConnectionError("Failed to fetch summary from Pi-hole.");
    }
    const data = (await response.json()) as SummaryInfo;
    return {
      status: data.status,
      domains_being_blocked: data.domains_being_blocked,
      dns_queries_today: data.dns_queries_today,
      ads_blocked_today: data.ads_blocked_today,
      ads_percentage_today: data.ads_percentage_today,
      unique_clients: data.unique_clients,
      queries_cached: data.queries_cached,
      privacy_level: data.privacy_level,
      gravity_last_updated: data.gravity_last_updated,
    };
  }

  async getQueryLogs(seconds: number): Promise<PaginatedQueryLogs> {
    const now = Math.floor(Date.now() / 1000);
    const from = now - seconds;
    const response = await fetchWithTimeout(this.url(`getAllQueries&from=${from}&until=${now}`));
    if (!response.ok) {
      throw new PiholeConnectionError("Failed to fetch query logs from Pi-hole.");
    }
    const { data } = (await response.json()) as QueryLogs;
    return {
      data: data
        .sort((a, b) => parseInt(b[0]) - parseInt(a[0]))
        .map((entry) => ({
          timestamp: formatTimestamp(parseInt(entry[0])),
          domain: entry[2],
          client: entry[3],
          blockStatus: this.parseBlockStatus(entry[4]),
        })),
      hasMore: false,
    };
  }

  async getTopQueries(count: number): Promise<{
    topAllowed: import("../interfaces").DomainDetails[];
    topBlocked: import("../interfaces").DomainDetails[];
  }> {
    const response = await fetchWithTimeout(this.url(`topItems=${count}`));
    if (!response.ok) {
      throw new PiholeConnectionError("Failed to fetch top queries from Pi-hole.");
    }
    const { top_queries, top_ads } = (await response.json()) as TopQueries;
    return {
      topAllowed: Object.entries(top_queries).map(([domainURL, blockCount]) => ({
        domainURL,
        blockCount: blockCount.toString(),
      })),
      topBlocked: Object.entries(top_ads).map(([domainURL, blockCount]) => ({
        domainURL,
        blockCount: blockCount.toString(),
      })),
    };
  }

  async enable(): Promise<void> {
    const response = await fetchWithTimeout(this.url("enable"));
    if (!response.ok) {
      throw new PiholeConnectionError("Failed to enable Pi-hole.");
    }
  }

  async disable(duration?: number): Promise<void> {
    const param = duration !== undefined ? `disable=${duration}` : "disable";
    const response = await fetchWithTimeout(this.url(param));
    if (!response.ok) {
      throw new PiholeConnectionError("Failed to disable Pi-hole.");
    }
  }

  async addToList(domain: string, list: "allow" | "deny"): Promise<void> {
    const listParam = list === "deny" ? "black" : "white";
    const response = await fetchWithTimeout(this.url(`list=${listParam}&add=${domain}`));
    if (!response.ok) {
      throw new PiholeConnectionError(`Failed to add ${domain} to ${list}list.`);
    }
  }

  async getTopClients(count: number): Promise<ClientDetails[]> {
    const response = await fetchWithTimeout(this.url(`topClients=${count}`));
    if (!response.ok) {
      throw new PiholeConnectionError("Failed to fetch top clients from Pi-hole.");
    }
    const data = (await response.json()) as {
      top_sources: Record<string, number>;
    };
    return Object.entries(data.top_sources ?? {}).map(([key, queryCount]) => {
      const parts = key.split("|");
      return {
        name: parts[0] || parts[1] || key,
        ip: parts[1] || parts[0],
        count: queryCount,
      };
    });
  }

  async updateGravity(): Promise<void> {
    throw new PiholeConnectionError("Update Gravity is only available on Pi-hole v6.");
  }

  async addSubscriptionList(): Promise<void> {
    throw new PiholeConnectionError("Subscription list management is only available on Pi-hole v6.");
  }

  async getSubscriptionLists(): Promise<never> {
    throw new PiholeConnectionError("Subscription list management is only available on Pi-hole v6.");
  }

  async deleteSubscriptionList(): Promise<never> {
    throw new PiholeConnectionError("Subscription list management is only available on Pi-hole v6.");
  }

  async toggleSubscriptionList(): Promise<never> {
    throw new PiholeConnectionError("toggleSubscriptionList is only available on Pi-hole v6.");
  }

  // --- Real implementations ---

  async getQueryTypes(): Promise<QueryTypeBreakdown> {
    const response = await fetchWithTimeout(this.url("getQueryTypes"));
    if (!response.ok) {
      throw new PiholeConnectionError("Failed to fetch query types from Pi-hole.");
    }
    const data = (await response.json()) as {
      querytypes: Record<string, number>;
    };
    const types: Record<string, number> = {};
    for (const [key, value] of Object.entries(data.querytypes)) {
      const normalized = key.replace(/\s*\(.*?\)/, "");
      types[normalized] = value;
    }
    return { types };
  }

  async getRecentBlocked(): Promise<string[]> {
    const response = await fetchWithTimeout(this.url("recentBlocked"));
    if (!response.ok) {
      throw new PiholeConnectionError("Failed to fetch recent blocked domain from Pi-hole.");
    }
    const domain = await response.text();
    return [domain];
  }

  async getDomains(): Promise<DomainEntry[]> {
    const [whiteRes, blackRes] = await Promise.all([
      fetchWithTimeout(this.url("list=white")),
      fetchWithTimeout(this.url("list=black")),
    ]);
    if (!whiteRes.ok || !blackRes.ok) {
      throw new PiholeConnectionError("Failed to fetch domain lists from Pi-hole.");
    }
    const whitelist = (await whiteRes.json()) as string[];
    const blacklist = (await blackRes.json()) as string[];
    const entries: DomainEntry[] = [];
    whitelist.forEach((domain, index) => {
      entries.push({
        id: index,
        domain,
        type: "allow",
        kind: "exact",
        enabled: true,
        comment: null,
        date_added: 0,
        groups: [],
      });
    });
    blacklist.forEach((domain, index) => {
      entries.push({
        id: whitelist.length + index,
        domain,
        type: "deny",
        kind: "exact",
        enabled: true,
        comment: null,
        date_added: 0,
        groups: [],
      });
    });
    return entries;
  }

  // --- v6-only stubs ---

  async searchDomain(): Promise<never> {
    throw new PiholeConnectionError("searchDomain is only available on Pi-hole v6.");
  }

  async getNetworkDevices(): Promise<never> {
    throw new PiholeConnectionError("getNetworkDevices is only available on Pi-hole v6.");
  }

  async getSystemInfo(): Promise<never> {
    throw new PiholeConnectionError("getSystemInfo is only available on Pi-hole v6.");
  }

  async restartDNS(): Promise<never> {
    throw new PiholeConnectionError("restartDNS is only available on Pi-hole v6.");
  }

  async flushLogs(): Promise<never> {
    throw new PiholeConnectionError("flushLogs is only available on Pi-hole v6.");
  }

  async downloadBackup(): Promise<never> {
    throw new PiholeConnectionError("downloadBackup is only available on Pi-hole v6.");
  }

  async getGroups(): Promise<never> {
    throw new PiholeConnectionError("getGroups is only available on Pi-hole v6.");
  }

  async createGroup(): Promise<never> {
    throw new PiholeConnectionError("createGroup is only available on Pi-hole v6.");
  }

  async deleteGroup(): Promise<never> {
    throw new PiholeConnectionError("deleteGroup is only available on Pi-hole v6.");
  }

  async toggleGroup(): Promise<never> {
    throw new PiholeConnectionError("toggleGroup is only available on Pi-hole v6.");
  }

  async getClients(): Promise<never> {
    throw new PiholeConnectionError("getClients is only available on Pi-hole v6.");
  }

  async deleteDomain(type: string, _kind: string, domain: string): Promise<void> {
    const listParam = type === "allow" ? "white" : "black";
    const response = await fetchWithTimeout(this.url(`list=${listParam}&sub=${domain}`));
    if (!response.ok) {
      throw new PiholeConnectionError(`Failed to delete ${domain} from ${type}list.`);
    }
  }

  async getConfig(): Promise<never> {
    throw new PiholeConnectionError("getConfig is only available on Pi-hole v6.");
  }

  async updateClientGroups(): Promise<never> {
    throw new PiholeConnectionError("updateClientGroups is only available on Pi-hole v6.");
  }

  async updateDomainGroups(): Promise<never> {
    throw new PiholeConnectionError("updateDomainGroups is only available on Pi-hole v6.");
  }

  private parseBlockStatus(status: string): QueryBlockStatus {
    switch (status) {
      case "1":
      case "4":
      case "5":
        return QueryBlockStatus.Blocked;
      case "3":
        return QueryBlockStatus.Cached;
      default:
        return QueryBlockStatus.NotBlocked;
    }
  }
}
