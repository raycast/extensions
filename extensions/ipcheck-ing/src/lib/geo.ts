import { lookupCache } from "./cache";
import { requestText } from "./http";
import { GeoInfo, GeoMap } from "./types";

// ip-api.com's free tier is HTTP-only (TLS is paid). The list only needs city and country,
// which ipwho.is serves over HTTPS without a key, so collected addresses never go out in
// plaintext and a network observer cannot forge labels that we then cache and display.
const GEO_ENDPOINT = "https://ipwho.is";
const GEO_FIELDS = "success,ip,city,country,country_code";

interface GeoResponse {
  success?: unknown;
  ip?: unknown;
  city?: unknown;
  country?: unknown;
  country_code?: unknown;
}

export async function fetchGeo(ips: string[]): Promise<GeoMap> {
  const unique = [...new Set(ips)];
  if (unique.length === 0) return {};

  const results: GeoMap = {};
  const missing: string[] = [];

  // Cached per IP rather than per call: overlapping lookups reuse whatever is already known
  // and only the genuinely new addresses cost a request.
  for (const ip of unique) {
    const cached = lookupCache.read<GeoInfo>(geoKey(ip));
    if (cached) {
      results[ip] = cached;
    } else {
      missing.push(ip);
    }
  }

  const settled = await Promise.allSettled(missing.map(lookupGeo));
  let firstError: unknown;

  for (const [index, outcome] of settled.entries()) {
    const ip = missing[index];
    switch (outcome.status) {
      case "fulfilled":
        if (outcome.value) {
          results[ip] = outcome.value;
        }
        break;
      case "rejected":
        firstError ??= outcome.reason;
        break;
      default: {
        const _exhaustive: never = outcome;
        throw new Error(`Unexpected lookup result: ${_exhaustive}`);
      }
    }
  }

  // If every fresh lookup failed, surface the first error so the list's toast still fires.
  // Partial success is useful on its own — cached entries and HTTPS-trace fallbacks cover the rest.
  if (firstError !== undefined && missing.every((ip) => results[ip] === undefined)) {
    throw firstError;
  }

  return results;
}

export function countryCodeToFlagEmoji(countryCode: string): string {
  if (countryCode.length !== 2) return "";
  return countryCode.toUpperCase().replace(/[A-Z]/g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/** "CN" -> "China". Falls back to the raw code if the runtime has no region data. */
export function countryName(countryCode: string | undefined): string | undefined {
  if (!countryCode) return undefined;

  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(countryCode.toUpperCase()) ?? countryCode;
  } catch {
    return countryCode;
  }
}

async function lookupGeo(ip: string): Promise<GeoInfo | undefined> {
  const body = await requestText(`${GEO_ENDPOINT}/${encodeURIComponent(ip)}?fields=${GEO_FIELDS}`, {
    accept: "application/json",
  });

  const item = parseGeoResponse(body, ip);
  if (!item) return undefined;

  const info = toGeoInfo(item);
  if (!info.label) return undefined;

  // Always keyed by the address we asked about, never by a field from the payload.
  lookupCache.write(geoKey(ip), info);
  return info;
}

function parseGeoResponse(
  body: string,
  requestedIp: string,
): { city?: string; country?: string; countryCode?: string } | undefined {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return undefined;
  }

  if (!payload || typeof payload !== "object") return undefined;

  const item = payload as GeoResponse;
  if (item.success !== true || typeof item.ip !== "string") return undefined;

  // Drop replies whose identity does not match the address we requested — otherwise a
  // tampered payload could write a location under a different IP, or under this one
  // using someone else's record.
  if (item.ip.toLowerCase() !== requestedIp.toLowerCase()) return undefined;

  return {
    city: optionalText(item.city),
    country: optionalText(item.country),
    countryCode: optionalCountryCode(item.country_code),
  };
}

function optionalText(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 80) return undefined;
  if ([...value].some((char) => char.charCodeAt(0) < 32)) return undefined;

  const text = value.trim();
  return text || undefined;
}

function optionalCountryCode(value: unknown): string | undefined {
  if (typeof value !== "string" || !/^[A-Za-z]{2}$/.test(value)) return undefined;
  return value.toUpperCase();
}

function geoKey(ip: string): string {
  return `geo:ipwho:${ip}`;
}

function toGeoInfo(item: { city?: string; country?: string; countryCode?: string }): GeoInfo {
  const flag = item.countryCode ? countryCodeToFlagEmoji(item.countryCode) : "";
  const place = [item.city, item.country].filter(Boolean).join(", ");

  return {
    flag,
    place,
    label: [place, flag].filter(Boolean).join(" "),
    countryCode: item.countryCode,
  };
}
