import tzlookup from "tz-lookup";
import type { Location } from "../core/types";

const UA = "yatt/0.1 (Yet Another Timezone Tool, a Raycast extension; https://github.com/alexbartok/yatt-for-raycast)";

type NominatimRow = {
  osm_type: string;
  osm_id: number;
  lat: string;
  lon: string;
  name?: string;
  display_name: string;
  address?: { country_code?: string; state?: string; county?: string; city?: string; town?: string; village?: string };
};

const MIN_INTERVAL_MS = 1100;
let lastRequest = 0;

/** Enforces Nominatim's limit of one request per second across every caller in this process. */
async function rateGate(): Promise<void> {
  const wait = lastRequest + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest = Date.now();
}

/** Looks a place up on OpenStreetMap (Nominatim usage policy: ≤1 request/s, identify the app). Times out after 10 s. */
export async function searchOnline(query: string, signal?: AbortSignal): Promise<Location[]> {
  await rateGate();
  signal?.throwIfAborted();
  const timeout = AbortSignal.timeout(10_000);
  signal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "8");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("featureType", "settlement");
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "en" }, signal });
  if (!res.ok) throw new Error(`OpenStreetMap: HTTP ${res.status}`);
  const rows = (await res.json()) as NominatimRow[];
  const out: Location[] = [];
  for (const r of rows) {
    const lat = Number(r.lat);
    const lon = Number(r.lon);
    let tz: string;
    try {
      tz = tzlookup(lat, lon);
    } catch {
      continue;
    }
    const a = r.address ?? {};
    const label = r.name || a.city || a.town || a.village || r.display_name.split(",")[0];
    out.push({
      id: `custom:osm:${r.osm_type}${r.osm_id}`,
      kind: "city",
      label,
      tz,
      country: a.country_code?.toUpperCase(),
      region: a.state ?? a.county,
      aliases: [],
    });
  }
  return out;
}
