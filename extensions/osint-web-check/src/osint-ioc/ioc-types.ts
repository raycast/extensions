/**
 * OSINT Toolkit - Type Definitions
 *
 * This file contains all TypeScript type definitions used throughout the extension
 */

export type IOCType = "ip" | "ipv6" | "domain" | "url" | "hash" | "unknown";

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
}

export interface SearchResult {
  source: OSINTSource;
  url: string;
  ioc: string;
  iocType: IOCType;
}
