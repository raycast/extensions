export interface PiHoleStatus {
  status: "enabled" | "disabled";
  domains_being_blocked: number;
  dns_queries_today: number;
  ads_blocked_today: number;
  ads_percentage_today: number;
  unique_domains: number;
  queries_forwarded: number;
  queries_cached: number;
  clients_ever_seen: number;
  unique_clients: number;
  gravity_last_updated: {
    file_exists: boolean;
    absolute: number;
    relative: {
      days: number;
      hours: number;
      minutes: number;
    };
  };
}

export interface PiHoleQuery {
  domain: string;
  status: "blocked" | "allowed" | "unknown";
  type: "A" | "AAAA" | "PTR" | "SRV" | "TXT" | "CNAME" | "MX";
  client: string;
  timestamp: number;
}

export interface PiHoleDomainList {
  id: number;
  domain: string;
  type: "allow" | "deny" | "regex_allow" | "regex_deny";
  enabled: boolean;
  date_added: number;
  date_modified: number;
  comment: string;
}

export interface PiHoleQueryResult {
  domain: string;
  status:
    | "blocked"
    | "allowed"
    | "unknown"
    | "no_recent_queries"
    | "never_queried";
  reason: string;
  type: "A" | "AAAA" | "PTR" | "SRV" | "TXT" | "CNAME" | "MX";
  lastSeen: number;
  queryCount: number;
}

export interface PiHoleError {
  error: string;
  message?: string;
}

export interface PiHoleApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DomainListOptions {
  domain: string;
  type?: "allow" | "deny" | "regex_allow" | "regex_deny";
  comment?: string;
}

export interface DisableOptions {
  duration?: string; // e.g., "5m", "1h", "30s"
  seconds?: number;
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
  version?: string;
}
