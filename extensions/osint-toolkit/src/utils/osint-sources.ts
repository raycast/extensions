/**
 * OSINT Sources Configuration
 *
 * Defines all OSINT platforms and their configurations
 */

import { OSINTSource, IOCType } from "../types";

export const OSINT_SOURCES: OSINTSource[] = [
  // Multi-purpose platforms
  {
    id: "virustotal",
    name: "VirusTotal",
    description: "Analyze suspicious files, URLs, domains and IP addresses",
    url: "https://www.virustotal.com",
    category: "Multi-Purpose",
    supportedTypes: ["ip", "ipv6", "domain", "url", "hash"],
    requiresAuth: false,
    isFree: true,
    icon: "virus",
  },
  {
    id: "alienvault",
    name: "AlienVault OTX",
    description: "Open Threat Exchange - collaborative threat intelligence",
    url: "https://otx.alienvault.com",
    category: "Multi-Purpose",
    supportedTypes: ["ip", "ipv6", "domain", "url", "hash"],
    requiresAuth: false,
    isFree: true,
    icon: "alien",
  },
  {
    id: "pulsedive",
    name: "Pulsedive",
    description: "Free threat intelligence platform",
    url: "https://pulsedive.com",
    category: "Multi-Purpose",
    supportedTypes: ["ip", "ipv6", "domain", "url", "hash"],
    requiresAuth: false,
    isFree: true,
    icon: "wave",
  },
  {
    id: "opentip",
    name: "Kaspersky OpenTIP",
    description: "Kaspersky's threat intelligence platform",
    url: "https://opentip.kaspersky.com",
    category: "Multi-Purpose",
    supportedTypes: ["hash"],
    requiresAuth: false,
    isFree: true,
    icon: "lock",
  },

  // IP Intelligence
  {
    id: "abuseipdb",
    name: "AbuseIPDB",
    description: "IP address threat intelligence and blacklist service",
    url: "https://www.abuseipdb.com",
    category: "IP Intelligence",
    supportedTypes: ["ip", "ipv6"],
    requiresAuth: false,
    isFree: true,
    icon: "block",
  },
  {
    id: "shodan",
    name: "Shodan",
    description: "Search engine for internet-connected devices",
    url: "https://www.shodan.io",
    category: "IP Intelligence",
    supportedTypes: ["ip"],
    requiresAuth: false,
    isFree: true,
    icon: "search",
  },
  {
    id: "ipinfo",
    name: "ipinfo.io",
    description: "Comprehensive IP address data and API",
    url: "https://ipinfo.io",
    category: "IP Intelligence",
    supportedTypes: ["ip", "ipv6"],
    requiresAuth: false,
    isFree: true,
    icon: "globe",
  },
  {
    id: "greynoise",
    name: "GreyNoise",
    description: "Internet background noise intelligence",
    url: "https://viz.greynoise.io",
    category: "IP Intelligence",
    supportedTypes: ["ip"],
    requiresAuth: false,
    isFree: true,
    icon: "radio",
  },

  // URL Analysis
  {
    id: "urlscan",
    name: "URLScan.io",
    description: "Website scanner and domain investigation",
    url: "https://urlscan.io",
    category: "URL Analysis",
    supportedTypes: ["url", "domain"],
    requiresAuth: false,
    isFree: true,
    icon: "link",
  },
  {
    id: "webcheck",
    name: "WebCheck",
    description: "All-in-one website analysis tool",
    url: "https://web-check.as93.net",
    category: "URL Analysis",
    supportedTypes: ["domain", "url"],
    requiresAuth: false,
    isFree: true,
    icon: "check",
  },
  {
    id: "whois",
    name: "WHOIS",
    description: "Domain registration information lookup",
    url: "https://whois.com",
    category: "Domain Analysis",
    supportedTypes: ["domain"],
    requiresAuth: false,
    isFree: true,
    icon: "info",
  },

  // Malware Analysis
  {
    id: "hybridanalysis",
    name: "Hybrid Analysis",
    description: "Free automated malware analysis service",
    url: "https://www.hybrid-analysis.com",
    category: "Malware Analysis",
    supportedTypes: ["hash", "url", "domain"],
    requiresAuth: false,
    isFree: true,
    icon: "dna",
  },
  {
    id: "joesandbox",
    name: "Joe Sandbox",
    description: "Advanced malware analysis platform",
    url: "https://www.joesandbox.com",
    category: "Malware Analysis",
    supportedTypes: ["hash", "ip"],
    requiresAuth: false,
    isFree: true,
    icon: "sandbox",
  },
  {
    id: "malwarebazaar",
    name: "MalwareBazaar",
    description: "Malware sample sharing platform",
    url: "https://bazaar.abuse.ch",
    category: "Malware Analysis",
    supportedTypes: ["hash"],
    requiresAuth: false,
    isFree: true,
    icon: "shop",
  },

  // Threat Intelligence
  {
    id: "threatfox",
    name: "ThreatFox",
    description: "IOC sharing platform by abuse.ch",
    url: "https://threatfox.abuse.ch",
    category: "Threat Intelligence",
    supportedTypes: ["ip", "domain", "url", "hash"],
    requiresAuth: false,
    isFree: true,
    icon: "fox",
  },
  {
    id: "threatrip",
    name: "threat.rip",
    description: "Fast and simple threat intelligence for file hashes",
    url: "https://threat.rip",
    category: "Threat Intelligence",
    supportedTypes: ["hash"],
    requiresAuth: false,
    isFree: true,
    icon: "grave",
  },
  {
    id: "xforce",
    name: "IBM X-Force Exchange",
    description: "Threat intelligence sharing platform",
    url: "https://exchange.xforce.ibmcloud.com",
    category: "Threat Intelligence",
    supportedTypes: ["ip", "ipv6", "domain", "url", "hash"],
    requiresAuth: false,
    isFree: true,
    icon: "force",
  },

  // SSL/Certificate
  {
    id: "censys",
    name: "Censys",
    description: "Internet-wide search engine for devices and certificates",
    url: "https://search.censys.io",
    category: "Certificate Analysis",
    supportedTypes: ["ip", "ipv6", "domain"],
    requiresAuth: false,
    isFree: true,
    icon: "cert",
  },
  {
    id: "crtsh",
    name: "crt.sh",
    description: "Certificate transparency log search",
    url: "https://crt.sh",
    category: "Certificate Analysis",
    supportedTypes: ["domain"],
    requiresAuth: false,
    isFree: true,
    icon: "certificate",
  },
];

/**
 * Get OSINT sources for a specific IOC type
 */
export function getSourcesForIOCType(iocType: IOCType): OSINTSource[] {
  return OSINT_SOURCES.filter((source) =>
    source.supportedTypes.includes(iocType),
  );
}

/**
 * Get a specific OSINT source by ID
 */
export function getSourceById(id: string): OSINTSource | undefined {
  return OSINT_SOURCES.find((source) => source.id === id);
}

/**
 * Check if a source is enabled in preferences
 */
export function isSourceEnabled(
  sourceId: string,
  preferences: Record<string, unknown>,
): boolean {
  const prefKey = `enable_${sourceId}`;
  const isEnabled = preferences[prefKey];

  // If preference doesn't exist, default to true
  return isEnabled === undefined ? true : Boolean(isEnabled);
}

/**
 * Get all enabled sources for an IOC type
 */
export function getEnabledSourcesForIOCType(
  iocType: IOCType,
  preferences: Record<string, unknown>,
): OSINTSource[] {
  return getSourcesForIOCType(iocType).filter((source) =>
    isSourceEnabled(source.id, preferences),
  );
}
