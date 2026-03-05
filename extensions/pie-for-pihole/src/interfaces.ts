export interface TopQueries {
  top_queries: Record<string, number>;
  top_ads: Record<string, number>;
}

export interface domainDetails {
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
  unique_domains: string;
  queries_forwarded: string;
  queries_cached: string;
  clients_ever_seen: string;
  unique_clients: string;
  dns_queries_all_types: string;
  reply_UNKNOWN: string;
  reply_NODATA: string;
  reply_NXDOMAIN: string;
  reply_CNAME: string;
  reply_IP: string;
  reply_DOMAIN: string;
  reply_RRNAME: string;
  reply_SERVFAIL: string;
  reply_REFUSED: string;
  reply_NOTIMP: string;
  reply_OTHER: string;
  reply_DNSSEC: string;
  reply_NONE: string;
  reply_BLOB: string;
  dns_queries_all_replies: string;
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
