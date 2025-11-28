/**
 * URL Builder Utilities
 *
 * Constructs search URLs for various OSINT platforms
 */

import { IOCType } from "../types";
import { sha256 } from "./ioc-detection";

function encodeKeywordSearch(keyword: string, value: string): string {
  return encodeURIComponent(`${keyword}:${value}`);
}

/**
 * Build search URL for a given OSINT source and IOC
 */
export async function buildSearchURL(
  sourceId: string,
  ioc: string,
  iocType: IOCType,
): Promise<string> {
  const encodedIOC = encodeURIComponent(ioc);

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

    // Joe Sandbox
    case "joesandbox": {
      if (iocType === "hash") {
        // Joe Sandbox uses specific hash type parameters
        // We need to determine the hash type from the length
        const hashLength = ioc.length;
        if (hashLength === 32) {
          return `https://www.joesandbox.com/analysis/search?md5=${encodedIOC}`;
        } else if (hashLength === 40) {
          return `https://www.joesandbox.com/analysis/search?sha1=${encodedIOC}`;
        } else if (hashLength === 64) {
          return `https://www.joesandbox.com/analysis/search?sha256=${encodedIOC}`;
        }
        return `https://www.joesandbox.com/analysis/search?q=${encodedIOC}`;
      } else if (iocType === "ip") {
        return `https://www.joesandbox.com/analysis/search?ioc-public-ip=${encodedIOC}`;
      }
      return `https://www.joesandbox.com/analysis/search?q=${encodedIOC}`;
    }

    // MalwareBazaar
    case "malwarebazaar":
      return `https://bazaar.abuse.ch/browse.php?search=${encodedIOC}`;

    // ThreatFox
    case "threatfox":
      if (iocType === "ip" || iocType === "ipv6") {
        return `https://threatfox.abuse.ch/browse/#${encodeKeywordSearch("ip", ioc)}`;
      } else if (iocType === "domain") {
        return `https://threatfox.abuse.ch/browse/#${encodeKeywordSearch("domain", ioc)}`;
      } else if (iocType === "hash") {
        return `https://threatfox.abuse.ch/browse/#${encodeKeywordSearch("hash", ioc)}`;
      } else if (iocType === "url") {
        return `https://threatfox.abuse.ch/browse/#${encodeKeywordSearch("url", ioc)}`;
      }
      return `https://threatfox.abuse.ch/browse/#${encodeURIComponent(ioc)}`;

    // threat.rip
    case "threatrip":
      return `https://threat.rip/search?q=${encodeURIComponent(`hash:${ioc}`)}`;

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
    case "pulsedive": {
      const base64IOC = Buffer.from(ioc).toString("base64");
      return `https://pulsedive.com/indicator/?ioc=${base64IOC}`;
    }

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
        // Normalize URL like VirusTotal does
        let normalizedUrl = ioc;
        try {
          const urlObj = new URL(ioc);
          // Add trailing slash if there's no path
          if (urlObj.pathname === "") {
            urlObj.pathname = "/";
          }
          normalizedUrl = urlObj.toString();
        } catch {
          // If URL parsing fails, try adding trailing slash if it ends with domain
          if (!ioc.includes("/", ioc.indexOf("://") + 3)) {
            normalizedUrl = ioc + "/";
          }
        }
        const urlHash = await sha256(normalizedUrl);
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
