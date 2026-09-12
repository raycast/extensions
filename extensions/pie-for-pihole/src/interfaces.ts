export interface TopQueries {
  top_queries: Record<string, number>;
  top_ads: Record<string, number>;
}

export interface DomainDetails {
  domainURL: string;
  blockCount: string;
}

export interface ClientDetails {
  name: string;
  ip: string;
  count: number;
}
export interface SummaryInfo {
  domains_being_blocked: string;
  dns_queries_today: string;
  ads_blocked_today: string;
  ads_percentage_today: string;
  queries_cached: string;
  unique_clients: string;
  privacy_level: string;
  status: string;
  gravity_last_updated: GravityLastUpdated;
}

export interface QueryLogs {
  data: string[][];
}

export enum QueryBlockStatus {
  Blocked,
  NotBlocked,
  Cached,
}

export interface QueryLog {
  timestamp: string;
  domain: string;
  client: string;
  blockStatus: QueryBlockStatus;
}

export interface GravityLastUpdated {
  file_exists: boolean;
  absolute: number;
  relative: Relative;
}

export interface Relative {
  days: number;
  hours: number;
  minutes: number;
}

export interface SubscriptionList {
  id: number;
  address: string;
  type: string;
  enabled: boolean;
  comment: string | null;
  date_added: number;
}
