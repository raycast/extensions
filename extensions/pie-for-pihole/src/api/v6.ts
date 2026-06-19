import { type ClientDetails, type DomainDetails, QueryBlockStatus, type SubscriptionList } from "../interfaces";
import { SessionManager } from "./session";
import { formatTimestamp } from "./shared";
import type {
  ConfiguredClient,
  DomainEntry,
  DomainSearchResult,
  Group,
  NetworkDevice,
  NormalizedSummary,
  PaginatedQueryLogs,
  PiholeAPI,
  QueryTypeBreakdown,
  SystemInfo,
} from "./types";

// v6 API response types
interface V6Summary {
  queries: {
    total: number;
    blocked: number;
    percent_blocked: number;
    unique_domains: number;
    forwarded: number;
    cached: number;
    types: Record<string, number>;
    status: Record<string, number>;
    replies: Record<string, number>;
  };
  clients: {
    active: number;
    total: number;
  };
  gravity: {
    domains_being_blocked: number;
    last_update: number;
  };
}

interface V6BlockingStatus {
  blocking: string | boolean;
  timer: number | null;
}

interface V6ConfigValue {
  config: { misc: { privacyLevel: number } };
}

interface V6Query {
  id: number;
  time: number;
  type: string;
  domain: string;
  status: string;
  client: {
    ip: string;
    name: string | null;
  };
  reply: {
    type: string | null;
    time: number;
  };
}

interface V6QueriesResponse {
  queries: V6Query[];
  cursor?: number;
}

interface V6TopDomainsResponse {
  domains: Array<{ domain: string; count: number }>;
}

function normalizeBlockingStatus(value: unknown): string {
  if (value === true || value === "enabled") return "enabled";
  if (value === false || value === "disabled") return "disabled";
  return "unknown";
}

export class PiholeV6 implements PiholeAPI {
  private session = new SessionManager();

  async getSummary(): Promise<NormalizedSummary> {
    // /stats/summary doesn't include blocking status or privacy level in v6.
    // Fetch them from their dedicated endpoints in parallel.
    const [data, blockingStatus, privacyLevel] = await Promise.all([
      this.session.request<V6Summary>("/stats/summary"),
      this.session.request<V6BlockingStatus>("/dns/blocking"),
      this.session
        .request<V6ConfigValue>("/config/misc/privacyLevel")
        .then((r) => r.config?.misc?.privacyLevel ?? 0)
        .catch(() => 0),
    ]);

    const lastUpdate = data.gravity?.last_update ?? 0;
    const now = Math.floor(Date.now() / 1000);
    const diffSeconds = now - lastUpdate;
    const days = Math.floor(diffSeconds / 86400);
    const hours = Math.floor((diffSeconds % 86400) / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);

    return {
      status: normalizeBlockingStatus(blockingStatus.blocking),
      domains_being_blocked: String(data.gravity?.domains_being_blocked ?? 0),
      dns_queries_today: String(data.queries?.total ?? 0),
      ads_blocked_today: String(data.queries?.blocked ?? 0),
      ads_percentage_today: String((data.queries?.percent_blocked ?? 0).toFixed(1)),
      unique_clients: String(data.clients?.active ?? 0),
      queries_cached: String(data.queries?.cached ?? 0),
      privacy_level: String(privacyLevel),
      gravity_last_updated: {
        file_exists: lastUpdate > 0,
        absolute: lastUpdate,
        relative: { days, hours, minutes },
      },
    };
  }

  async getQueryLogs(seconds: number, pageSize = 100, cursor?: number): Promise<PaginatedQueryLogs> {
    const now = Math.floor(Date.now() / 1000);
    const from = now - seconds;
    let url = `/queries?from=${from}&until=${now}&length=${pageSize}`;
    if (cursor !== undefined) {
      url += `&cursor=${cursor}`;
    }
    const data = await this.session.request<V6QueriesResponse>(url);
    const queries = (data.queries ?? [])
      .sort((a, b) => b.time - a.time)
      .map((q) => ({
        timestamp: formatTimestamp(q.time),
        domain: q.domain,
        client: q.client?.name || q.client?.ip || "unknown",
        blockStatus: this.parseV6Status(q.status),
      }));

    return {
      data: queries,
      hasMore: data.cursor != null && (data.queries?.length ?? 0) >= pageSize,
      cursor: data.cursor,
    };
  }

  async getTopQueries(count: number): Promise<{ topAllowed: DomainDetails[]; topBlocked: DomainDetails[] }> {
    const [allowed, blocked] = await Promise.all([
      this.session.request<V6TopDomainsResponse>(`/stats/top_domains?count=${count}`),
      this.session.request<V6TopDomainsResponse>(`/stats/top_domains?blocked=true&count=${count}`),
    ]);

    return {
      topAllowed: (allowed.domains ?? []).map((d) => ({
        domainURL: d.domain,
        blockCount: String(d.count),
      })),
      topBlocked: (blocked.domains ?? []).map((d) => ({
        domainURL: d.domain,
        blockCount: String(d.count),
      })),
    };
  }

  async enable(): Promise<void> {
    await this.session.request("/dns/blocking", {
      method: "POST",
      body: JSON.stringify({ blocking: true }),
    });
  }

  async disable(duration?: number): Promise<void> {
    const body: { blocking: boolean; timer?: number } = { blocking: false };
    if (duration !== undefined) {
      body.timer = duration;
    }
    await this.session.request("/dns/blocking", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async addToList(domain: string, list: "allow" | "deny", kind: "exact" | "regex" = "exact"): Promise<void> {
    const endpoint = `/domains/${list}/${kind}`;
    await this.session.request(endpoint, {
      method: "POST",
      body: JSON.stringify({ domain }),
    });
  }

  async getTopClients(count: number): Promise<ClientDetails[]> {
    interface V6TopClientsResponse {
      clients: Array<{ name: string; ip: string; count: number }>;
    }
    const data = await this.session.request<V6TopClientsResponse>(`/stats/top_clients?count=${count}`);
    return (data.clients ?? []).map((c) => ({
      name: c.name || c.ip,
      ip: c.ip,
      count: c.count,
    }));
  }

  async updateGravity(): Promise<void> {
    await this.session.requestText("/action/gravity", { method: "POST" });
  }

  async addSubscriptionList(address: string, type: "allow" | "block"): Promise<void> {
    await this.session.request("/lists", {
      method: "POST",
      body: JSON.stringify({ address, type, enabled: true }),
    });
  }

  async getSubscriptionLists(): Promise<SubscriptionList[]> {
    const data = await this.session.request<{ lists: SubscriptionList[] }>("/lists");
    return data.lists ?? [];
  }

  async deleteSubscriptionList(address: string): Promise<void> {
    await this.session.request(`/lists/${encodeURIComponent(address)}`, {
      method: "DELETE",
    });
  }

  async toggleSubscriptionList(address: string, enabled: boolean): Promise<void> {
    await this.session.request(`/lists/${encodeURIComponent(address)}`, {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });
  }

  async searchDomain(domain: string, partial = true): Promise<DomainSearchResult> {
    const data = await this.session.request<{
      search: DomainSearchResult;
    }>(`/search/${encodeURIComponent(domain)}?partial=${partial}`);
    return data.search;
  }

  async getQueryTypes(): Promise<QueryTypeBreakdown> {
    const data = await this.session.request<{
      querytypes: Record<string, number>;
    }>("/stats/query_types");
    return { types: data.querytypes ?? {} };
  }

  async getRecentBlocked(count = 1): Promise<string[]> {
    const data = await this.session.request<{
      recent_blocked: string[];
    }>(`/stats/recent_blocked?count=${count}`);
    return data.recent_blocked;
  }

  async getNetworkDevices(maxDevices?: number): Promise<NetworkDevice[]> {
    const query = maxDevices !== undefined ? `?max_devices=${maxDevices}` : "";
    const data = await this.session.request<{
      network: NetworkDevice[];
    }>(`/network/devices${query}`);
    return (data.network ?? []).map((device) => ({
      ...device,
      name: device.ips?.[0]?.name ?? "",
      ip: device.ips?.[0]?.ip ?? "",
    }));
  }

  async getSystemInfo(): Promise<SystemInfo> {
    interface V6SystemResponse {
      system: {
        uptime: number;
        memory: {
          ram: { total: number; used: number; "%used": number };
          swap: { total: number; used: number; "%used": number };
        };
        cpu: {
          "%cpu": number;
          nprocs: number;
          load: { raw: number[]; percent: number[] };
        };
        ftl?: { memory: number; cpu: number };
      };
    }
    interface V6VersionEntry {
      local: { version: string; branch: string; hash: string };
      remote: { version: string; hash: string } | null;
    }
    interface V6VersionResponse {
      version: {
        core: V6VersionEntry;
        web: V6VersionEntry;
        ftl: V6VersionEntry;
        docker: { local: unknown; remote: unknown } | null;
      };
    }

    const [systemData, hostData, versionData] = await Promise.all([
      this.session.request<V6SystemResponse>("/info/system"),
      this.session.request<{
        host: {
          uname: { nodename: string; sysname: string; release: string };
          model: string | null;
        };
      }>("/info/host"),
      this.session.request<V6VersionResponse>("/info/version"),
    ]);

    const sys = systemData.system;
    return {
      uptime: sys.uptime,
      memory: {
        ram: {
          total: sys.memory.ram.total * 1024,
          used: sys.memory.ram.used * 1024,
          perc: sys.memory.ram["%used"] ?? 0,
        },
        swap: {
          total: sys.memory.swap.total * 1024,
          used: sys.memory.swap.used * 1024,
          perc: sys.memory.swap["%used"] ?? 0,
        },
      },
      cpu: {
        usage: sys.cpu["%cpu"] ?? 0,
        nprocs: sys.cpu.nprocs,
        load: sys.cpu.load?.raw ?? [],
      },
      ftl: sys.ftl ?? { memory: 0, cpu: 0 },
      host: {
        name: hostData.host.uname?.nodename ?? "",
        model: hostData.host.model ?? "",
        kernel: `${hostData.host.uname?.sysname ?? ""} ${hostData.host.uname?.release ?? ""}`.trim(),
      },
      version: {
        core: versionData.version.core?.local?.version ?? "unknown",
        web: versionData.version.web?.local?.version ?? "unknown",
        ftl: versionData.version.ftl?.local?.version ?? "unknown",
        docker: !!versionData.version.docker?.local,
      },
    };
  }

  async restartDNS(): Promise<void> {
    await this.session.request("/action/restartdns", { method: "POST" });
  }

  async flushLogs(): Promise<void> {
    await this.session.request("/action/flush/logs", { method: "POST" });
  }

  async downloadBackup(): Promise<{ data: Buffer; filename: string }> {
    const data = await this.session.requestBuffer("/teleporter");
    return { data, filename: "pihole-backup.zip" };
  }

  async getGroups(): Promise<Group[]> {
    const data = await this.session.request<{ groups: Group[] }>("/groups");
    return data.groups ?? [];
  }

  async createGroup(name: string, comment?: string): Promise<void> {
    const body: { name: string; comment?: string } = { name };
    if (comment !== undefined) {
      body.comment = comment;
    }
    await this.session.request("/groups", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async deleteGroup(name: string): Promise<void> {
    await this.session.request(`/groups/${encodeURIComponent(name)}`, {
      method: "DELETE",
    });
  }

  async toggleGroup(name: string, enabled: boolean): Promise<void> {
    await this.session.request(`/groups/${encodeURIComponent(name)}`, {
      method: "PUT",
      body: JSON.stringify({ enabled }),
    });
  }

  async getClients(): Promise<ConfiguredClient[]> {
    const data = await this.session.request<{
      clients: ConfiguredClient[];
    }>("/clients");
    return data.clients ?? [];
  }

  async getDomains(): Promise<DomainEntry[]> {
    const data = await this.session.request<{
      domains: DomainEntry[];
    }>("/domains");
    return data.domains ?? [];
  }

  async deleteDomain(type: string, kind: string, domain: string): Promise<void> {
    await this.session.request(`/domains/${type}/${kind}/${encodeURIComponent(domain)}`, { method: "DELETE" });
  }

  async updateClientGroups(client: string, groups: number[]): Promise<void> {
    await this.session.request(`/clients/${encodeURIComponent(client)}`, {
      method: "PUT",
      body: JSON.stringify({ groups }),
    });
  }

  async updateDomainGroups(type: string, kind: string, domain: string, groups: number[]): Promise<void> {
    await this.session.request(`/domains/${type}/${kind}/${encodeURIComponent(domain)}`, {
      method: "PUT",
      body: JSON.stringify({ groups }),
    });
  }

  async getConfig(): Promise<Record<string, unknown>> {
    const data = await this.session.request<{
      config: Record<string, unknown>;
    }>("/config");
    return data.config;
  }

  private parseV6Status(status: string): QueryBlockStatus {
    const s = status.toUpperCase();
    if (
      s === "GRAVITY" ||
      s === "REGEX" ||
      s === "DENYLIST" ||
      s === "EXTERNAL_BLOCKED_IP" ||
      s === "EXTERNAL_BLOCKED_NULL" ||
      s === "EXTERNAL_BLOCKED_NXRA" ||
      s.includes("BLOCK")
    ) {
      return QueryBlockStatus.Blocked;
    }
    if (s === "CACHE" || s === "CACHED") {
      return QueryBlockStatus.Cached;
    }
    return QueryBlockStatus.NotBlocked;
  }
}
