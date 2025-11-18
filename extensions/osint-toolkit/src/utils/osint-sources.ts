/**
 * OSINT Sources Configuration
 *
 * Defines all OSINT platforms and their configurations
 */

import { OSINTSource, IOCType } from "../types";
import { LocalStorage } from "@raycast/api";

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
    supportedTypes: ["ip", "ipv6", "domain", "url", "hash", "email"],
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
    supportedTypes: ["domain", "url", "hash"],
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
  {
    id: "ipqualityscore",
    name: "IPQualityScore",
    description: "Fraud detection and IP reputation service",
    url: "https://www.ipqualityscore.com",
    category: "IP Intelligence",
    supportedTypes: ["ip"],
    requiresAuth: false,
    isFree: true,
    icon: "target",
  },

  // URL Analysis
  {
    id: "urlscan",
    name: "URLScan.io",
    description: "Website scanner and domain investigation",
    url: "https://urlscan.io",
    category: "URL/Domain Analysis",
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
    category: "URL/Domain Analysis",
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
    category: "URL/Domain Analysis",
    supportedTypes: ["domain"],
    requiresAuth: false,
    isFree: true,
    icon: "info",
  },
  {
    id: "securitytrails",
    name: "SecurityTrails",
    description: "Domain and DNS intelligence",
    url: "https://securitytrails.com",
    category: "URL/Domain Analysis",
    supportedTypes: ["domain"],
    requiresAuth: false,
    isFree: true,
    icon: "trail",
  },

  // Malware Analysis
  {
    id: "hybridanalysis",
    name: "Hybrid Analysis",
    description: "Free automated malware analysis service",
    url: "https://www.hybrid-analysis.com",
    category: "Malware Analysis",
    supportedTypes: ["hash", "url"],
    requiresAuth: false,
    isFree: true,
    icon: "dna",
  },
  {
    id: "anyrun",
    name: "ANY.RUN",
    description: "Interactive online malware sandbox",
    url: "https://app.any.run",
    category: "Malware Analysis",
    supportedTypes: ["hash", "url"],
    requiresAuth: false,
    isFree: true,
    icon: "run",
  },
  {
    id: "joesandbox",
    name: "Joe Sandbox",
    description: "Advanced malware analysis platform",
    url: "https://www.joesandbox.com",
    category: "Malware Analysis",
    supportedTypes: ["hash", "url"],
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
    supportedTypes: ["ip", "domain", "url", "hash", "email"],
    requiresAuth: false,
    isFree: true,
    icon: "fox",
  },
  {
    id: "threatrip",
    name: "threat.rip",
    description: "Fast and simple threat intelligence",
    url: "https://threat.rip",
    category: "Threat Intelligence",
    supportedTypes: ["ip"],
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
    supportedTypes: ["ip", "domain", "url", "hash"],
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
    category: "Certificate/SSL",
    supportedTypes: ["ip", "domain"],
    requiresAuth: false,
    isFree: true,
    icon: "cert",
  },
  {
    id: "crtsh",
    name: "crt.sh",
    description: "Certificate transparency log search",
    url: "https://crt.sh",
    category: "Certificate/SSL",
    supportedTypes: ["domain"],
    requiresAuth: false,
    isFree: true,
    icon: "certificate",
  },
  // Email-specific sources
  {
    id: "haveibeenpwned",
    name: "Have I Been Pwned",
    description: "Check whether an email has appeared in a data breach",
    url: "https://haveibeenpwned.com/unifiedsearch/${ioc}",
    category: "Threat Intelligence",
    supportedTypes: ["email"],
    requiresAuth: false,
    isFree: true,
    icon: "shield",
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

// Storage key for user-defined custom sources
const CUSTOM_SOURCES_KEY = "custom_osint_sources";

/**
 * Return custom sources stored by the user in LocalStorage
 */
export async function getCustomSources(): Promise<OSINTSource[]> {
  const raw = await LocalStorage.getItem<string>(CUSTOM_SOURCES_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as OSINTSource[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
}

export async function saveCustomSources(sources: OSINTSource[]): Promise<void> {
  await LocalStorage.setItem(CUSTOM_SOURCES_KEY, JSON.stringify(sources));
}

export async function addCustomSource(source: OSINTSource): Promise<void> {
  const current = await getCustomSources();
  // avoid duplicates; id must be unique
  const existsIndex = current.findIndex((s) => s.id === source.id);
  if (existsIndex >= 0) {
    current[existsIndex] = source;
  } else {
    current.unshift(source);
  }
  await saveCustomSources(current);
}

export async function removeCustomSource(id: string): Promise<void> {
  const current = await getCustomSources();
  const filtered = current.filter((s) => s.id !== id);
  await saveCustomSources(filtered);
}

/**
 * Returns all sources (bundled + custom) merged.
 */
export async function getAllSources(): Promise<OSINTSource[]> {
  const custom = await getCustomSources();
  // Custom sources can override or extend builtin ones (by id)
  const customIds = new Set(custom.map((s) => s.id));
  const merged = OSINT_SOURCES.filter((s) => !customIds.has(s.id)).concat(
    custom,
  );
  return merged;
}

/**
 * Check if a source is enabled in preferences
 */
export function isSourceEnabled(
  source: OSINTSource,
  preferences: Record<string, unknown>,
): boolean {
  // If a source has explicit `enabled` property (custom sources), use that
  const maybeEnabled = (
    source as Partial<OSINTSource> & {
      enabled?: boolean;
    }
  ).enabled;
  if (maybeEnabled !== undefined) {
    return maybeEnabled;
  }

  const prefKey = `enable_${source.id}`;
  const isEnabled = preferences[prefKey];

  // If preference doesn't exist, default to true
  return isEnabled === undefined ? true : Boolean(isEnabled);
}

/**
 * Get all enabled sources for an IOC type
 */
export async function getEnabledSourcesForIOCType(
  iocType: IOCType,
  preferences: Record<string, unknown>,
): Promise<OSINTSource[]> {
  const all = await getAllSources();
  return all
    .filter((source) => source.supportedTypes.includes(iocType))
    .filter((source) => isSourceEnabled(source, preferences));
}

/**
 * Get a source by id searching through bundled + custom sources
 */
export async function getSourceByIdAsync(
  id: string,
): Promise<OSINTSource | undefined> {
  const all = await getAllSources();
  return all.find((s) => s.id === id);
}
