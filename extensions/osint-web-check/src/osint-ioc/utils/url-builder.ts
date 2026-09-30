/**
 * URL Builder Utilities
 *
 * Constructs search URLs for various OSINT platforms
 */

import { IOCType } from "../ioc-types";

/**
 * Build search URL for a given OSINT source and IOC
 */
export async function buildSearchURL(sourceId: string, ioc: string, iocType: IOCType): Promise<string> {
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
        const escaped = ioc.replace(/([+\-=&&||><!(){}[\]^"~*?:/\\])/g, "\\$1");
        return `https://urlscan.io/search/?q=page.url.keyword:${encodeURIComponent(escaped)}`;
      } else if (iocType === "domain") {
        return `https://urlscan.io/search/?q=page.domain:${encodedIOC}`;
      }
      return `https://urlscan.io/search/?q=${encodedIOC}`;

    // WebCheck
    case "webcheck":
      return `https://web-check.xyz/check/${encodedIOC}`;

    // WHOIS
    case "whois":
      return `https://who.is/whois/${encodedIOC}`;

    // MalwareBazaar
    case "malwarebazaar":
      return `https://bazaar.abuse.ch/sample/${encodedIOC}`;

    // Pulsedive
    case "pulsedive": {
      const base64 = Buffer.from(ioc).toString("base64").replace(/=+$/, "");
      return `https://pulsedive.com/indicator/?ioc=${base64}`;
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
function buildVirusTotalURL(ioc: string, iocType: IOCType): string {
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
      try {
        const base64url = Buffer.from(ioc)
          .toString("base64")
          .replace(/\+/g, "-")
          .replace(/\//g, "_")
          .replace(/=+$/, "");
        return `https://www.virustotal.com/gui/url/${base64url}`;
      } catch {
        return `https://www.virustotal.com/gui/search/${encodedIOC}`;
      }
    default:
      return `https://www.virustotal.com/gui/search/${encodedIOC}`;
  }
}
