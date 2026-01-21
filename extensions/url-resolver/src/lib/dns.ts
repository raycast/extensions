import { getPreferenceValues } from "@raycast/api";
import type { DoHResponse } from "../types";
import { debugLog } from "./log";

// DNS-over-HTTPS providers
const DNS_PROVIDERS = {
  cloudflare: {
    endpoint: "https://cloudflare-dns.com/dns-query",
  },
  google: {
    endpoint: "https://dns.google/resolve",
  },
  quad9: {
    endpoint: "https://dns.quad9.net/dns-query",
  },
  opendns: {
    endpoint: "https://doh.opendns.com/dns-query",
  },
} as const;

async function queryDoH(
  hostname: string,
  type: "A" | "AAAA",
  provider: keyof typeof DNS_PROVIDERS = "cloudflare"
): Promise<DoHResponse | null> {
  const endpoint = DNS_PROVIDERS[provider].endpoint;

  try {
    const response = await fetch(`${endpoint}?name=${encodeURIComponent(hostname)}&type=${type}`, {
      headers: { Accept: "application/dns-json" },
    });

    if (!response.ok) {
      debugLog(`[DoH] Failed for ${hostname} (${type}) via ${provider}: HTTP ${response.status}`);
      return null;
    }

    return (await response.json()) as DoHResponse;
  } catch (error) {
    debugLog(`[DoH] Error for ${hostname} (${type}) via ${provider}:`, error);
    return null;
  }
}

export async function resolveViaDoH(
  hostname: string,
  depth = 0,
  provider?: keyof typeof DNS_PROVIDERS
): Promise<string | null> {
  // Get provider from preferences if not specified
  if (!provider) {
    const prefs = getPreferenceValues<Preferences>();
    provider = prefs.dnsProvider;
  }

  // Prevent infinite CNAME loops
  if (depth > 10) {
    debugLog(`[DoH] Max CNAME depth reached for ${hostname}`);
    return null;
  }

  debugLog(`[DoH] Resolving ${hostname} via ${provider}...`);

  const resolved = await (async (): Promise<string | null> => {
    const aData = await queryDoH(hostname, "A", provider);
    const aAnswers = aData?.Answer ?? [];

    const aRecord = aAnswers.find((answer) => answer.type === 1);
    if (aRecord) return aRecord.data;

    const cnameFromA = aAnswers.find((answer) => answer.type === 5);
    if (cnameFromA) {
      const cname = cnameFromA.data.replace(/\.$/, "");
      debugLog(`[DoH] ${hostname} is CNAME -> ${cname}, following...`);
      return resolveViaDoH(cname, depth + 1, provider);
    }

    const aaaaData = await queryDoH(hostname, "AAAA", provider);
    const aaaaAnswers = aaaaData?.Answer ?? [];

    const aaaaRecord = aaaaAnswers.find((answer) => answer.type === 28);
    if (aaaaRecord) return aaaaRecord.data;

    const cnameFromAAAA = aaaaAnswers.find((answer) => answer.type === 5);
    if (cnameFromAAAA) {
      const cname = cnameFromAAAA.data.replace(/\.$/, "");
      debugLog(`[DoH] ${hostname} is CNAME -> ${cname}, following...`);
      return resolveViaDoH(cname, depth + 1, provider);
    }

    return null;
  })();

  if (resolved) {
    debugLog(`[DoH] Resolved ${hostname} -> ${resolved}`);
  } else {
    debugLog(`[DoH] No A/AAAA/CNAME record for ${hostname}`);
  }

  return resolved;
}
