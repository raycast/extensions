import type { ClientDetails, DomainDetails, QueryLog, SubscriptionList } from "../interfaces";

export interface NormalizedSummary {
  status: string;
  domains_being_blocked: string;
  dns_queries_today: string;
  ads_blocked_today: string;
  ads_percentage_today: string;
  unique_clients: string;
  queries_cached: string;
  privacy_level: string;
  gravity_last_updated: {
    file_exists: boolean;
    absolute: number;
    relative: { days: number; hours: number; minutes: number };
  };
}

export interface DomainSearchResult {
  domains: Array<{
    domain: string;
    type: string;
    kind: string;
    enabled: boolean;
    comment: string | null;
  }>;
  gravity: Array<{ domain: string; address: string }>;
}

export interface QueryTypeBreakdown {
  types: Record<string, number>;
}

export interface NetworkDevice {
  id: number;
  hwaddr: string;
  interface: string;
  firstSeen: number;
  lastQuery: number;
  numQueries: number;
  macVendor: string;
  name: string;
  ip: string;
  ips: Array<{ ip: string; name: string }>;
}

export interface SystemInfo {
  uptime: number;
  memory: {
    ram: { total: number; used: number; perc: number };
    swap: { total: number; used: number; perc: number };
  };
  cpu: { usage: number; nprocs: number; load: number[] };
  ftl: { memory: number; cpu: number };
  host: { name: string; model: string; kernel: string };
  version: { core: string; web: string; ftl: string; docker: boolean };
}

export interface Group {
  name: string;
  comment: string | null;
  enabled: boolean;
  id?: number;
}

export interface ConfiguredClient {
  id: number;
  client: string;
  name: string;
  comment: string | null;
  groups: string[];
}

export interface DomainEntry {
  id: number;
  domain: string;
  type: string;
  kind: string;
  enabled: boolean;
  comment: string | null;
  date_added: number;
  groups: string[];
}

export interface PaginatedQueryLogs {
  data: QueryLog[];
  hasMore: boolean;
  cursor?: number;
}

export interface PiholeAPI {
  getSummary(): Promise<NormalizedSummary>;
  getQueryLogs(seconds: number, pageSize?: number, cursor?: number): Promise<PaginatedQueryLogs>;
  getTopQueries(count: number): Promise<{ topAllowed: DomainDetails[]; topBlocked: DomainDetails[] }>;
  enable(): Promise<void>;
  disable(duration?: number): Promise<void>;
  addToList(domain: string, list: "allow" | "deny", kind?: "exact" | "regex"): Promise<void>;
  getTopClients(count: number): Promise<ClientDetails[]>;
  updateGravity(): Promise<void>;
  addSubscriptionList(address: string, type: "allow" | "block"): Promise<void>;
  getSubscriptionLists(): Promise<SubscriptionList[]>;
  deleteSubscriptionList(address: string): Promise<void>;

  // New methods
  searchDomain(domain: string, partial?: boolean): Promise<DomainSearchResult>;
  getQueryTypes(): Promise<QueryTypeBreakdown>;
  getRecentBlocked(count?: number): Promise<string[]>;
  getNetworkDevices(maxDevices?: number): Promise<NetworkDevice[]>;
  getSystemInfo(): Promise<SystemInfo>;
  restartDNS(): Promise<void>;
  flushLogs(): Promise<void>;
  downloadBackup(): Promise<{ data: Buffer; filename: string }>;
  getGroups(): Promise<Group[]>;
  createGroup(name: string, comment?: string): Promise<void>;
  deleteGroup(name: string): Promise<void>;
  toggleGroup(name: string, enabled: boolean): Promise<void>;
  getClients(): Promise<ConfiguredClient[]>;
  getDomains(): Promise<DomainEntry[]>;
  deleteDomain(type: string, kind: string, domain: string): Promise<void>;
  getConfig(): Promise<Record<string, unknown>>;
  toggleSubscriptionList(address: string, enabled: boolean): Promise<void>;
  updateClientGroups(client: string, groups: number[]): Promise<void>;
  updateDomainGroups(type: string, kind: string, domain: string, groups: number[]): Promise<void>;
}
