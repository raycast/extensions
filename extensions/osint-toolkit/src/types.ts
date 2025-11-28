/**
 * OSINT Toolkit - Type Definitions
 *
 * This file contains all TypeScript type definitions used throughout the extension
 */

export type IOCType =
  | "ip"
  | "ipv6"
  | "domain"
  | "url"
  | "hash"
  | "email"
  | "unknown";

export type HashType = "md5" | "sha1" | "sha256" | "unknown";

export interface IOCDetectionResult {
  type: IOCType;
  value: string;
  hashType?: HashType;
  isValid: boolean;
  confidence: number;
}

export interface OSINTSource {
  id: string;
  name: string;
  description: string;
  url: string;
  category: string;
  supportedTypes: IOCType[];
  requiresAuth: boolean;
  isFree: boolean;
  icon?: string;
  // Custom sources or user-saved sources may include an enabled flag
  enabled?: boolean;
}

export interface SearchResult {
  source: OSINTSource;
  url: string;
  ioc: string;
  iocType: IOCType;
}

export interface ExtensionPreferences extends Record<string, unknown> {
  virustotal_api_key?: string;
  abuseipdb_api_key?: string;
  shodan_api_key?: string;
  alienvault_api_key?: string;
  urlscan_api_key?: string;
  enable_virustotal: boolean;
  enable_abuseipdb: boolean;
  enable_shodan: boolean;
  enable_alienvault: boolean;
  enable_urlscan: boolean;
  enable_threatfox: boolean;
  enable_hybridanalysis: boolean;
  enable_anyrun: boolean;
  enable_pulsedive: boolean;
  enable_ipinfo: boolean;
  enable_haveibeenpwned: boolean;
  copy_on_select: boolean;
  summary_only_mode?: boolean;
  // Controls whether the 'Have I Been Pwned' quick link is shown for detected email IOCs
  show_hibp_quick_link?: boolean;
}
