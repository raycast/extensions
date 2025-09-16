// Types for DNS analysis
export interface DNSRecord {
  type: string;
  value: string;
  ttl?: number;
}

export interface DNSInfo {
  domain: string;
  A: DNSRecord[];
  AAAA: DNSRecord[];
  MX: DNSRecord[];
  NS: DNSRecord[];
  TXT: DNSRecord[];
  SOA: DNSRecord[];
  CNAME: DNSRecord[];
  parent?: string;
}

// Types for ping information
export interface PingInfo {
  host: string;
  alive: boolean;
  time?: number;
  min?: number;
  max?: number;
  avg?: number;
  loss?: number;
  error?: string;
}

// Types for domain status
export interface DomainStatus {
  domain: string;
  online: boolean;
  status_code?: number;
  response_time?: number;
  ssl_valid?: boolean;
  ssl_expires?: string;
  error?: string;
}

// Types for whois information
export interface WhoisInfo {
  domain: string;
  registrar?: string;
  created_date?: string;
  updated_date?: string;
  expires_date?: string;
  nameservers?: string[];
  contacts?: {
    registrant?: Contact;
    admin?: Contact;
    tech?: Contact;
  };
  status?: string[];
  error?: string;
}

export interface Contact {
  name?: string;
  organization?: string;
  email?: string;
  country?: string;
}

// Types for geographic/IP information
export interface IPInfo {
  ip: string;
  reverse_dns?: string;
  country?: string;
  country_code?: string;
  region?: string;
  city?: string;
  isp?: string;
  organization?: string;
  as?: string;
  timezone?: string;
  error?: string;
}

// Types for detected technologies
export interface TechnologyInfo {
  domain: string;
  technologies: Technology[];
  cms?: string;
  server?: string;
  languages?: string[];
  frameworks?: string[];
  error?: string;
}

export interface Technology {
  name: string;
  version?: string;
  category: string;
  confidence?: number;
}

// Main type that encompasses all information
export interface DomainAnalysis {
  domain: string;
  dns?: DNSInfo;
  ping?: PingInfo;
  status?: DomainStatus;
  whois?: WhoisInfo;
  ip_info?: IPInfo;
  technologies?: TechnologyInfo;
  loading: {
    dns: boolean;
    ping: boolean;
    status: boolean;
    whois: boolean;
    ip_info: boolean;
    technologies: boolean;
  };
  errors: {
    dns?: string;
    ping?: string;
    status?: string;
    whois?: string;
    ip_info?: string;
    technologies?: string;
  };
}

// Extension preferences
export interface ExtensionPreferences {
  timeout: number;
}
