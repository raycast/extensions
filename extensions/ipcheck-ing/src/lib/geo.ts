import { lookupCache } from "./cache";
import { requestText } from "./http";
import { GeoInfo, GeoMap } from "./types";

// ip-api.com's free tier is HTTP-only and rate limited, so we use the batch endpoint:
// one request for every IP still missing from the cache.
const BATCH_ENDPOINT = "http://ip-api.com/batch?fields=status,message,country,countryCode,city,query";
const BATCH_SIZE = 100;

interface GeoResponse {
  status: "success" | "fail";
  message?: string;
  query: string;
  city?: string;
  country?: string;
  countryCode?: string;
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

  for (let index = 0; index < missing.length; index += BATCH_SIZE) {
    const chunk = missing.slice(index, index + BATCH_SIZE);
    const body = await requestText(BATCH_ENDPOINT, {
      method: "POST",
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(chunk),
    });

    for (const item of JSON.parse(body) as GeoResponse[]) {
      if (item.status !== "success") continue;

      const info = toGeoInfo(item);
      results[item.query] = info;
      lookupCache.write(geoKey(item.query), info);
    }
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

function geoKey(ip: string): string {
  return `geo:${ip}`;
}

function toGeoInfo(item: GeoResponse): GeoInfo {
  const flag = item.countryCode ? countryCodeToFlagEmoji(item.countryCode) : "";
  const place = [item.city, item.country].filter(Boolean).join(", ");

  return {
    flag,
    place,
    label: [place, flag].filter(Boolean).join(" "),
  };
}
