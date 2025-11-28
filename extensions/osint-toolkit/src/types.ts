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
}

export interface SearchResult {
  source: OSINTSource;
  url: string;
  ioc: string;
  iocType: IOCType;
}

export interface ExtensionPreferences extends Record<string, unknown> {
  enable_virustotal: boolean;
  enable_alienvault: boolean;
  enable_pulsedive: boolean;
  enable_opentip: boolean;
  enable_abuseipdb: boolean;
  enable_shodan: boolean;
  enable_ipinfo: boolean;
  enable_greynoise: boolean;
  enable_urlscan: boolean;
  enable_webcheck: boolean;
  enable_whois: boolean;
  enable_hybridanalysis: boolean;
  enable_joesandbox: boolean;
  enable_malwarebazaar: boolean;
  enable_threatfox: boolean;
  enable_threatrip: boolean;
  enable_xforce: boolean;
  enable_censys: boolean;
  enable_crtsh: boolean;
  copy_on_select: boolean;
}
