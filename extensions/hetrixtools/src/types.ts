type Location = {
  uptime_status: "up" | "down";
  response_time: number;
  last_check: number;
};
export type UptimeMonitor = {
  id: string;
  name: string;
  type: "website" | "ping" | "service" | "smtp" | "heartbeat";
  target: string | null;
  resolve_address: string;
  resolve_address_info: {
    ASN: string;
    ISP: string;
    City: string;
    Region: string;
    Country: string;
  };
  port: number | null;
  keyword: string | null;
  category: string;
  timeout: number;
  check_frequency: 1 | 3 | 5 | 10 | null;
  contact_lists: string[];
  created_at: number;
  last_check: number;
  last_status_change: number;
  uptime_status: "up" | "down";
  monitor_status: "active" | "paused" | "disabled" | "maint" | "maint_dnd";
  uptime: number;
  uptime_incl_maint: number;
  locations: Partial<
    Record<
      | "new_york"
      | "san_francisco"
      | "dallas"
      | "amsterdam"
      | "london"
      | "frankfurt"
      | "singapore"
      | "sydney"
      | "sao_paulo"
      | "tokyo"
      | "mumbai"
      | "moscow",
      Location
    >
  >;
  ssl_expiration_date: string | null;
  ssl_expiration_warn: boolean;
  ssl_expiration_warn_days: number;
  domain_expiration_date: string | null;
  domain_expiration_warn: boolean;
  domain_expiration_warn_days: number;
  nameservers: string[] | null;
  nameservers_change_warn: boolean;
  public_report: boolean;
  public_target: boolean;
  max_redirects: number | null;
  http_method: string | null;
  accepted_http_codes: number[] | null;
  verify_ssl_certificate: boolean;
  verify_ssl_hostname: boolean;
  number_of_tries: number | null;
  triggering_locations: number | null;
  alert_after_minutes: number;
  repeat_alert_times: number;
  repeat_alert_frequency: number;
  agent_id: string | null;
};

export type BlacklistMonitor = {
  id: string;
  name: string;
  type: "ipv4" | "domain";
  target: string;
  report_id: string;
  status: "active" | "disabled" | "processing";
  contact_lists: string[];
  listed: Array<{
    rbl: string;
    delist: string;
  }>;
  created_at: number;
  last_check: number;
};

export type ContactList = {
  id: string;
  name: string;
  default: boolean;
  email: string[];
};

export type StatusPage = {
  id: string;
  name: string;
  type: "blacklist" | "uptime";
  monitors: string[];
  password_protected: boolean;
  twitter_feed: boolean;
  twitter_user: string;
  twitter_pos: string;
};

export type SuccessResponse<T> = {
  meta: {
    total: number;
    total_filtered: number;
    returned: number;
    pagination: {
      current: number;
      last: number;
      previous: number | null;
      next: number | null;
    };
  };
} & { [key: string]: T[] };
export type ErrorResponse = {
  status: string;
  message: string;
};
