/**
 * URL Builder Utilities
 *
 * Constructs search URLs for various OSINT platforms
 */

import { IOCType } from "../types";
import { sha256 } from "./ioc-detection";
import { getSourceByIdAsync } from "./osint-sources";

/**
 * Build search URL for a given OSINT source and IOC
 */
export async function buildSearchURL(
  sourceId: string,
  ioc: string,
  iocType: IOCType,
): Promise<string> {
  const encodedIOC = encodeURIComponent(ioc);
  const base64IOC = Buffer.from(ioc).toString("base64");

  switch (sourceId) {
    // VirusTotal
    case "virustotal":
      return buildVirusTotalURL(ioc, iocType);

    // AlienVault OTX
    case "alienvault":
      if (iocType === "ip" || iocType === "ipv6") {
        return `https://otx.alienvault.com/indicator/ip/${encodedIOC}`;
      } else if (iocType === "domain") {
        return `https://otx.alienvault.com/indicator/domain/${encodedIOC}`;
      } else if (iocType === "url") {
        return `https://otx.alienvault.com/indicator/url/${encodedIOC}`;
      } else if (iocType === "hash") {
        return `https://otx.alienvault.com/indicator/file/${encodedIOC}`;
      }
      return `https://otx.alienvault.com/browse/global/pulses?q=${encodedIOC}`;

    // AbuseIPDB
    case "abuseipdb":
      return `https://www.abuseipdb.com/check/${encodedIOC}`;

    // Shodan
    case "shodan":
      return `https://www.shodan.io/host/${encodedIOC}`;

    // ipinfo.io
    case "ipinfo":
      return `https://ipinfo.io/${encodedIOC}`;

    // GreyNoise
    case "greynoise":
      return `https://viz.greynoise.io/ip/${encodedIOC}`;

    // IPQualityScore
    case "ipqualityscore":
      return `https://www.ipqualityscore.com/free-ip-lookup-proxy-vpn-test/lookup/${encodedIOC}`;

    // URLScan.io
    case "urlscan":
      if (iocType === "url") {
        return `https://urlscan.io/search/#${encodedIOC}`;
      } else if (iocType === "domain") {
        return `https://urlscan.io/search/#page.domain:${encodedIOC}`;
      }
      return `https://urlscan.io/search/#${encodedIOC}`;

    // WebCheck
    case "webcheck":
      return `https://web-check.xyz/check/${encodedIOC}`;

    // WHOIS
    case "whois":
      return `https://who.is/whois/${encodedIOC}`;

    // SecurityTrails
    case "securitytrails":
      if (iocType === "domain") {
        return `https://securitytrails.com/domain/${encodedIOC}/dns`;
      } else if (iocType === "ip") {
        return `https://securitytrails.com/list/ip/${encodedIOC}`;
      }
      return `https://securitytrails.com/`;

    // Hybrid Analysis
    case "hybridanalysis":
      if (iocType === "hash") {
        return `https://www.hybrid-analysis.com/search?query=${encodedIOC}`;
      } else if (iocType === "url") {
        return `https://www.hybrid-analysis.com/search?query=${encodedIOC}`;
      } else if (iocType === "domain") {
        return `https://www.hybrid-analysis.com/search?query=domain:${encodedIOC}`;
      }
      return `https://www.hybrid-analysis.com/search?query=${encodedIOC}`;

    // ANY.RUN
    case "anyrun":
      if (iocType === "hash") {
        return `https://app.any.run/submissions/#?search=${encodedIOC}`;
      } else if (iocType === "url" || iocType === "domain") {
        return `https://any.run/search/?q=${encodedIOC}`;
      }
      return `https://any.run/search/?q=${encodedIOC}`;

    // Joe Sandbox
    case "joesandbox":
      return `https://www.joesandbox.com/search?q=${encodedIOC}`;

    // MalwareBazaar
    case "malwarebazaar":
      return `https://bazaar.abuse.ch/browse.php?search=${encodedIOC}`;

    // ThreatFox
    case "threatfox":
      if (iocType === "ip" || iocType === "ipv6") {
        return `https://threatfox.abuse.ch/browse/#ip:${encodedIOC}`;
      } else if (iocType === "domain") {
        return `https://threatfox.abuse.ch/browse/#domain:${encodedIOC}`;
      } else if (iocType === "hash") {
        return `https://threatfox.abuse.ch/browse/#hash:${encodedIOC}`;
      } else if (iocType === "url") {
        return `https://threatfox.abuse.ch/browse/#url:${encodedIOC}`;
      }
      return `https://threatfox.abuse.ch/browse/#${encodedIOC}`;

    // threat.rip
    case "threatrip":
      if (iocType === "hash") {
        return `https://threat.rip/search?q=hash%253A${encodedIOC}`;
      } else if (iocType === "ip" || iocType === "ipv6") {
        return `https://threat.rip/search?q=ip%253A${encodedIOC}`;
      } else if (iocType === "domain") {
        return `https://threat.rip/search?q=domain%253A${encodedIOC}`;
      }
      return `https://threat.rip/search?q=${encodedIOC}`;

    // IBM X-Force Exchange
    case "xforce":
      if (iocType === "ip" || iocType === "ipv6") {
        return `https://exchange.xforce.ibmcloud.com/ip/${encodedIOC}`;
      } else if (iocType === "domain") {
        return `https://exchange.xforce.ibmcloud.com/url/${encodedIOC}`;
      } else if (iocType === "url") {
        return `https://exchange.xforce.ibmcloud.com/url/${encodedIOC}`;
      } else if (iocType === "hash") {
        return `https://exchange.xforce.ibmcloud.com/malware/${encodedIOC.toUpperCase()}`;
      }
      return `https://exchange.xforce.ibmcloud.com/`;

    // Pulsedive
    case "pulsedive":
      return `https://pulsedive.com/indicator/?ioc=${base64IOC}`;

    // Have I Been Pwned
    case "haveibeenpwned":
      return `https://haveibeenpwned.com/unifiedsearch/${encodedIOC}`;

    // Kaspersky OpenTIP
    case "opentip":
      return `https://opentip.kaspersky.com/${encodedIOC}`;

    // Censys
    case "censys":
      if (iocType === "ip" || iocType === "ipv6") {
        return `https://search.censys.io/hosts/${encodedIOC}`;
      } else if (iocType === "domain") {
        return `https://search.censys.io/search?resource=hosts&q=${encodedIOC}`;
      }
      return `https://search.censys.io/`;

    // crt.sh
    case "crtsh":
      return `https://crt.sh/?q=${encodedIOC}`;

    default:
      // If this is a user-provided custom source (from LocalStorage), try to honor its URL template
      try {
        const custom = await getSourceByIdAsync(sourceId);
        if (custom && custom.url) {
          const replaced = custom.url.replace(/\$\{ioc\}/g, encodedIOC);
          return replaced;
        }
      } catch {
        // ignore and fallback
      }
      return `https://www.google.com/search?q=${encodedIOC}`;
  }
}

/**
 * Build VirusTotal URL based on IOC type
 */
async function buildVirusTotalURL(
  ioc: string,
  iocType: IOCType,
): Promise<string> {
  const encodedIOC = encodeURIComponent(ioc);

  switch (iocType) {
    case "ip":
    case "ipv6":
      return `https://www.virustotal.com/gui/ip-address/${encodedIOC}`;
    case "domain":
      return `https://www.virustotal.com/gui/domain/${encodedIOC}`;
    case "hash":
      return `https://www.virustotal.com/gui/file/${encodedIOC}`;
    case "url":
      // For URLs, we need to compute SHA-256 hash
      try {
        const urlHash = await sha256(ioc);
        return `https://www.virustotal.com/gui/url/${urlHash}`;
      } catch {
        // Fallback to search if hash computation fails
        return `https://www.virustotal.com/gui/search/${encodedIOC}`;
      }
    default:
      return `https://www.virustotal.com/gui/search/${encodedIOC}`;
  }
}

/**
 * Get a human-readable description for an OSINT source
 */
export function getSourceDescription(
  sourceId: string,
  iocType: IOCType,
): string {
  const descriptions: Record<
    string,
    Partial<Record<IOCType, string>> & { default: string }
  > = {
    virustotal: {
      ip: "Check IP reputation and related files",
      domain: "Analyze domain reputation and DNS records",
      url: "Scan URL for malicious content",
      hash: "Get file analysis and detections",
      default: "Search across all VirusTotal data",
    },
    abuseipdb: {
      ip: "Check IP abuse reports and confidence score",
      default: "Check IP address reputation",
    },
    shodan: {
      ip: "View open ports and services",
      default: "Discover internet-facing systems",
    },
    urlscan: {
      url: "View website screenshot and behavior",
      domain: "Search all scans of this domain",
      default: "Analyze website behavior",
    },
  };

  const sourceDescriptions = descriptions[sourceId];
  if (!sourceDescriptions) {
    return "Search this IOC";
  }

  return (
    sourceDescriptions[iocType] ||
    sourceDescriptions.default ||
    "Search this IOC"
  );
}
