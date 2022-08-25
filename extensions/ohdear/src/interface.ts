export interface Preferences {
  apiKey: string;
  showGroups: boolean;
  uptime: boolean;
  performance: boolean;
  certificate_health: boolean;
  broken_links: boolean;
  mixed_content: boolean;
  application_health: boolean;
  scheduled_tasks: boolean;
  certificate_transparency: boolean;
  dns: boolean;
  domain: boolean;
}

export interface Team {
  id: number;
  name: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  photo_url: string;
  teams: Team[];
}

export interface Item {
  url: string;
  friendly_name: string | null;
  group_name: string | null;
  checks: string[];
}

export interface Site {
  id: number;
  url: string;
  sort_url: string;
  label: string;
  team_id: number;
  latest_run_date: string;
  summarized_check_result: string;
  created_at: string;
  updated_at: string;
  checks: Check[];
  group: string;
}

export interface Check {
  id: number;
  type: string;
  label: string;
  enabled: boolean;
  latest_run_ended_at: string;
  latest_run_result: string;
  summary: string;
}

export interface Sites {
  data: Site[];
  links: {
    first: string;
    last: string;
    prev: string;
    next: string;
  };
  meta: {
    current_page: number;
  };
}

export interface Uptime {
  datetime: string;
  uptime_percentage: number;
}

export interface Uptimes {
  data: Uptime[];
}

export interface Downtime {
  started_at: string;
  ended_at: string;
}

export interface Downtimes {
  data: Downtime[];
}

export interface BrokenLink {
  crawled_url: string;
  status_code: number;
  found_on_url: string;
}

export interface BrokenLinks {
  data: BrokenLink[];
  links: {
    first: string;
    last: string;
    prev: string;
    next: string;
  };
  meta: {
    current_page: number;
  };
}

export interface CertificateDetail {
  issuer: string;
  valid_from: string;
  valid_until: string;
}

export interface CertificateCheck {
  type: string;
  label: string;
  passed: boolean;
}

export interface CertificateHealth {
  certificate_details: CertificateDetail;
  certificate_checks: CertificateCheck[];
  certificate_chain_issuers: string[];
}

export interface MixedContent {
  element_name: string;
  mixed_content_url: string;
  found_on_url: string;
}

export interface MixedContents {
  data: MixedContent[];
}

export interface PerformanceRecordCurl {
  namelookup_time: number;
  connect_time: number;
  appconnect_time: number;
  starttransfer_time: number;
  pretransfer_time: number;
  redirect_time: number;
  total_time: number;
  header_size: number;
  size_download: number;
  speed_download: number;
}

export interface PerformanceRecord {
  dns_time_in_seconds: number;
  tcp_time_in_seconds: number;
  ssl_handshake_time_in_seconds: number;
  remote_server_processing_time_in_seconds: number;
  download_time_in_seconds: number;
  total_time_in_seconds: number;
  curl: PerformanceRecordCurl;
  created_at: string;
}

export interface PerformanceRecords {
  data: PerformanceRecord[];
}

export interface DNSRecord {
  id: number;
  authoritative_nameservers: string[];
  dns_records: any[];
  diff_summary: string;
  created_at: string;
}

export interface DNSRecords {
  data: DNSRecord[];
}
