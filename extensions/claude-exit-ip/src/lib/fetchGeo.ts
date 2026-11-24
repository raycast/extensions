import { parseGeo, type GeoResult } from "./geo";

export const GEO_URL = "https://ipwho.is";
const REQUEST_TIMEOUT_MS = 5000;

export async function fetchGeo(ip: string, signal: AbortSignal): Promise<GeoResult> {
  try {
    const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(REQUEST_TIMEOUT_MS)]);
    const response = await fetch(
      GEO_URL + "/" + encodeURIComponent(ip) + "?fields=country,country_code,city,connection",
      { signal: requestSignal },
    );
    if (response.status < 200 || response.status >= 300) return { kind: "failed" };
    return parseGeo(await response.json());
  } catch {
    return { kind: "failed" };
  }
}
