import { Cache, getPreferenceValues } from "@raycast/api";

export type UVReading = {
  uv: number;
  max: number;
  place: string;
  updatedAt: number;
};

type Location = { latitude: number; longitude: number; place: string };
type GeoResult = { latitude: number; longitude: number; name: string; country?: string; admin1?: string };

const cache = new Cache();

async function getJSON<T>(url: string): Promise<T> {
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return (await res.json()) as T;
}

// Accepts "Brisbane" or "Brisbane, Australia" / "Perth, Scotland" to disambiguate.
async function geocode(query: string): Promise<Location> {
  const [name, ...qualifiers] = query.split(",").map((part) => part.trim().toLowerCase());
  const data = await getJSON<{ results?: GeoResult[] }>(
    `https://geocoding-api.open-meteo.com/v1/search?count=10&name=${encodeURIComponent(name)}`,
  );
  const hit = data.results?.find((r) =>
    qualifiers.every((q) => [r.country, r.admin1].some((field) => field?.toLowerCase().includes(q))),
  );
  if (!hit) throw new Error(`Couldn't find "${query}". Check the City or Town in the extension settings.`);
  return { latitude: hit.latitude, longitude: hit.longitude, place: hit.name };
}

async function getLocation(): Promise<Location> {
  const query = getPreferenceValues<Preferences>().city.trim();
  const key = `geo:${query.toLowerCase()}`;
  const cached = cache.get(key);
  if (cached) return JSON.parse(cached) as Location;

  const location = await geocode(query);
  cache.set(key, JSON.stringify(location));
  return location;
}

export async function fetchUV(): Promise<UVReading> {
  const { latitude, longitude, place } = await getLocation();
  // CAMS UV forecast accounts for cloud cover and tracks measured UV far better than the weather-model value.
  const { hourly } = await getJSON<{ hourly: { time: number[]; uv_index: (number | null)[] } }>(
    `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${latitude}&longitude=${longitude}` +
      "&hourly=uv_index&timezone=auto&forecast_days=2&timeformat=unixtime",
  );

  // Interpolate between the surrounding hourly values so the reading reflects the current minute.
  const now = Date.now() / 1000;
  const i = hourly.time.findIndex((t, idx) => t <= now && now < (hourly.time[idx + 1] ?? Infinity));
  if (i === -1) throw new Error("No UV data available right now");
  const a = hourly.uv_index[i] ?? 0;
  const b = hourly.uv_index[i + 1] ?? a;
  const uv = a + (b - a) * ((now - hourly.time[i]) / 3600);

  // Today's peak: the first 24 hours are today in the location's own timezone.
  const max = Math.max(...hourly.uv_index.slice(0, 24).map((v) => v ?? 0));

  return { uv: Math.round(uv), max: Math.round(max), place, updatedAt: Date.now() };
}

export function uvLevel(uv: number): string {
  if (uv <= 2) return "Low";
  if (uv <= 5) return "Moderate";
  if (uv <= 7) return "High";
  if (uv <= 10) return "Very High";
  return "Extreme";
}
