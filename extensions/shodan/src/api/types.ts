// Shodan API Response Types

export interface ShodanLocation {
  city: string | null;
  region_code: string | null;
  area_code: number | null;
  longitude: number;
  latitude: number;
  country_code: string;
  country_name: string;
  postal_code: string | null;
  dma_code: number | null;
}

export interface ShodanSSL {
  cert: {
    subject: Record<string, string>;
    issuer: Record<string, string>;
    expires: string;
    fingerprint: Record<string, string>;
  };
  cipher: {
    name: string;
    bits: number;
    version: string;
  };
  chain: string[];
  versions: string[];
}

export interface ShodanHTTP {
  status: number;
  title?: string;
  server?: string;
  location?: string;
  html?: string;
  robots?: string;
  favicon?: {
    hash: number;
    data: string;
  };
}

export interface ShodanScreenshot {
  data: string; // base64 encoded image
  mime: string; // e.g., "image/png"
  width?: number;
  height?: number;
}

export interface ShodanService {
  port: number;
  transport: string;
  protocol?: string;
  product?: string;
  version?: string;
  cpe?: string[];
  data: string;
  timestamp: string;
  ssl?: ShodanSSL;
  http?: ShodanHTTP;
  screenshot?: ShodanScreenshot;
}

export interface ShodanHost {
  ip_str: string;
  ip: number;
  asn: string;
  isp: string;
  org: string;
  hostnames: string[];
  domains: string[];
  location: ShodanLocation;
  ports: number[];
  vulns?: string[];
  tags?: string[];
  os?: string;
  data: ShodanService[];
  last_update: string;
}

export interface ShodanSearchMatch {
  ip_str: string;
  ip: number;
  port: number;
  transport: string;
  product?: string;
  version?: string;
  org: string;
  asn: string;
  isp: string;
  os?: string;
  hostnames: string[];
  domains: string[];
  location: ShodanLocation;
  timestamp: string;
  data: string;
  vulns?: Record<string, { cvss: number; summary: string }>;
  ssl?: ShodanSSL;
  http?: ShodanHTTP;
  tags?: string[];
  _shodan?: {
    crawler: string;
    id: string;
    module: string;
  };
}

export interface ShodanSearchResponse {
  matches: ShodanSearchMatch[];
  total: number;
  facets?: Record<string, Array<{ value: string; count: number }>>;
}

export interface ShodanDomainInfo {
  domain: string;
  tags: string[];
  data: Array<{
    subdomain: string;
    type: string;
    value: string;
    last_seen: string;
  }>;
  subdomains: string[];
}

export interface ShodanExploit {
  _id: string;
  author: string;
  code?: string;
  date: string;
  description: string;
  platform?: string;
  port?: number;
  source: string;
  type: string;
  cve?: string[];
}

export interface ShodanExploitResponse {
  matches: ShodanExploit[];
  total: number;
}

export interface ShodanAlert {
  id: string;
  name: string;
  created: string;
  expires?: number;
  filters: {
    ip: string[];
  };
  size: number;
  triggers: Record<string, boolean>;
}

export interface ShodanProfile {
  member: boolean;
  credits: number;
  display_name: string | null;
  created: string;
}

export interface ApiInfo {
  scan_credits: number;
  query_credits: number;
  monitored_ips: number;
  plan: string;
  https: boolean;
  telnet: boolean;
  unlocked: boolean;
  unlocked_left: number;
}

export interface ApiCredits {
  queryCredits: number;
  scanCredits: number;
  monitorCredits: number;
  plan: string;
}

// Favorites and storage types
export interface FavoriteQuery {
  id: string;
  name: string;
  query: string;
  description?: string;
  createdAt: string;
  lastUsed?: string;
  useCount: number;
}

export interface RecentSearch {
  id: string;
  query: string;
  timestamp: string;
  resultCount: number;
}

// Preset query types
export interface PresetQuery {
  id: string;
  name: string;
  query: string;
  description: string;
  category: PresetCategory;
  risk: "low" | "medium" | "high";
}

export type PresetCategory =
  | "webcams"
  | "industrial"
  | "databases"
  | "network"
  | "authentication"
  | "vulnerabilities"
  | "iot"
  | "cloud"
  | "remote"
  | "storage"
  | "home"
  | "printers"
  | "misc";

// DNS types
export interface DnsResolveResponse {
  [hostname: string]: string;
}

export interface DnsReverseResponse {
  [ip: string]: string[];
}

// Honeyscore API response (Labs endpoint)
export interface HoneyscoreResponse {
  score: number; // 0.0 - 1.0 (higher = more likely honeypot)
}

// InternetDB API response (free, no API key required)
export interface InternetDBResponse {
  ip: string;
  ports: number[];
  hostnames: string[];
  tags: string[];
  cpes: string[];
  vulns: string[];
}
