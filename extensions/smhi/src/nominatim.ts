// Free-text geocoding via OpenStreetMap Nominatim. No API key.
// Nominatim usage policy: identify with a User-Agent and keep traffic light.
// https://operations.osmfoundation.org/policies/nominatim/
import { createTtlCache } from "./ttl-cache";

export interface GeocodeResult {
  displayName: string;
  name: string;
  lat: number;
  lon: number;
  addressType?: string;
}

interface NominatimRow {
  display_name: string;
  name: string;
  lat: string;
  lon: string;
  addresstype?: string;
}

const NOMINATIM_HOST = "https://nominatim.openstreetmap.org";
const USER_AGENT = "raycast-smhi-extension/0.1 (https://github.com/niklaslavrell/raycast-smhi)";
// SMHI's grid stops at the Nordics, so anything outside it would only ever resolve to an
// out-of-coverage notice. Without this, "Stockholm" returns three US villages.
const COUNTRY_CODES = "se,no,fi,dk";
// Place names don't move, so a week-old answer is as good as a fresh one.
const GEOCODE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const geocodeCache = createTtlCache<GeocodeResult[]>({ namespace: "geocode", ttlMs: GEOCODE_TTL_MS });

export async function geocode(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  return geocodeCache.getOrLoad(query.toLowerCase(), () => fetchGeocode(query, signal));
}

async function fetchGeocode(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  const url = `${NOMINATIM_HOST}/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=sv,en&countrycodes=${COUNTRY_CODES}`;
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal });
  if (!res.ok) {
    throw new Error(`Nominatim ${res.status} for "${query}"`);
  }
  const rows = (await res.json()) as NominatimRow[];
  return rows.map((row) => ({
    displayName: row.display_name,
    name: row.name,
    lat: Number(row.lat),
    lon: Number(row.lon),
    addressType: row.addresstype,
  }));
}
