import { describeNetworkError, requestText } from "./http";
import { IPEntry, SourceFailure, TraceInfo } from "./types";
import { isValidIP } from "./valid-ip";

/** Every external source is toggled by an extension preference of the same name. */
export type SourceId = Exclude<keyof ExtensionPreferences, "getLocalIPs">;

export interface IPSource {
  id: SourceId;
  label: string;
  url: string;
  family: "IPv4" | "IPv6";
  parse: (body: string) => TraceInfo;
}

/**
 * Cloudflare is addressed by IP literal on purpose: that is what pins the request to a
 * specific address family. 1.1.1.1 is used rather than the secondary 1.0.0.1 because it is
 * the better-reachable of the pair.
 */
export const IP_SOURCES: IPSource[] = [
  {
    id: "getIPFromCloudflare_V4",
    label: "Cloudflare IPv4",
    url: "https://1.1.1.1/cdn-cgi/trace",
    family: "IPv4",
    parse: parseTrace,
  },
  {
    id: "getIPFromCloudflare_V6",
    label: "Cloudflare IPv6",
    url: "https://[2606:4700:4700::1111]/cdn-cgi/trace",
    family: "IPv6",
    parse: parseTrace,
  },
  {
    id: "getIPFromIPCheck4",
    label: "IPCheck.ing IPv4",
    url: "https://4.ipcheck.ing/cdn-cgi/trace",
    family: "IPv4",
    parse: parseTrace,
  },
  {
    id: "getIPFromIPCheck6",
    label: "IPCheck.ing IPv6",
    url: "https://6.ipcheck.ing/cdn-cgi/trace",
    family: "IPv6",
    parse: parseTrace,
  },
  {
    // Dual stack: answers over whichever protocol the network prefers, so the result shows
    // whether IPv4 or IPv6 wins on this connection.
    id: "getIPFromIPCheck64",
    label: "IPCheck.ing DualStack",
    url: "https://64.ipcheck.ing/cdn-cgi/trace",
    family: "IPv4",
    parse: parseTrace,
  },
];

export function findSource(id: string): IPSource | undefined {
  return IP_SOURCES.find((source) => source.id === id);
}

export interface SourceResult {
  entry?: IPEntry;
  failure?: SourceFailure;
}

export async function fetchFromSource(source: IPSource): Promise<SourceResult> {
  try {
    const body = await requestText(source.url, { accept: "text/plain" });
    const trace = source.parse(body);

    if (!trace.ip || !isValidIP(trace.ip)) {
      return { failure: { source: source.label, message: "Unexpected response — no IP address found" } };
    }

    return {
      entry: {
        key: `external-${source.id}`,
        ip: trace.ip,
        source: source.label,
        kind: "external",
        family: trace.ip.includes(":") ? "IPv6" : "IPv4",
        countryCode: trace.countryCode,
      },
    };
  } catch (error) {
    return { failure: { source: source.label, message: describeNetworkError(error, source.family) } };
  }
}

/**
 * `/cdn-cgi/trace` is a flat `key=value` body. Besides the IP it carries `loc` — the country
 * Cloudflare places the client in — enough to label a result without spending a geolocation
 * lookup.
 */
function parseTrace(body: string): TraceInfo {
  const fields = new Map<string, string>();

  for (const line of body.split("\n")) {
    const separator = line.indexOf("=");
    if (separator > 0) {
      fields.set(line.slice(0, separator), line.slice(separator + 1).trim());
    }
  }

  const countryCode = fields.get("loc");

  return {
    ip: fields.get("ip"),
    // Cloudflare reports XX when it cannot place the client.
    countryCode: countryCode && countryCode !== "XX" ? countryCode : undefined,
  };
}
