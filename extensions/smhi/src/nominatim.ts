// Free-text geocoding via OpenStreetMap Nominatim. No API key.
// Nominatim usage policy: identify with a User-Agent and keep traffic light.
// https://operations.osmfoundation.org/policies/nominatim/
import { setTimeout as sleep } from "node:timers/promises";
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
// The policy caps clients at one request per second. Searching only on submit keeps requests rare,
// but a quick typo fix and resubmit could still land two inside a second, so space them out here.
const MIN_REQUEST_INTERVAL_MS = 1000;
let nextRequestAt = 0;

// Reserves the next free slot before waiting, so concurrent callers queue up rather than all
// waking at once. An aborted wait still uses up its slot, which errs on the polite side.
async function waitForRequestSlot(signal?: AbortSignal): Promise<void> {
  const now = Date.now();
  const slot = Math.max(now, nextRequestAt);
  nextRequestAt = slot + MIN_REQUEST_INTERVAL_MS;
  if (slot > now) await sleep(slot - now, undefined, { signal });
}

export async function geocode(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  return geocodeCache.getOrLoad(query.toLowerCase(), () => fetchGeocode(query, signal));
}

async function fetchGeocode(query: string, signal?: AbortSignal): Promise<GeocodeResult[]> {
  await waitForRequestSlot(signal);
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
