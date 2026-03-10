import { getPreferenceValues, Icon } from "@raycast/api";

const BASE_URL = "https://prim.iledefrance-mobilites.fr/marketplace/v2/navitia";

export const MODE_ORDER = ["Metro", "RER", "Transilien", "Tram", "Bus", "Noctilien"];

function getHeaders() {
  const { apiKey } = getPreferenceValues<Preferences>();
  return {
    apikey: apiKey,
    Accept: "application/json",
  };
}

// --- Types ---

export interface StopArea {
  id: string;
  name: string;
  coord: { lat: string; lon: string };
  administrative_regions?: Array<{ name: string; level: number }>;
  lines?: Line[];
}

export interface Line {
  id: string;
  name: string;
  code: string;
  color: string;
  text_color: string;
  commercial_mode: { id: string; name: string };
  network: { id: string; name: string };
}

export interface Departure {
  stop_point: {
    id: string;
    name: string;
    stop_area: { id: string; name: string };
  };
  route: {
    id: string;
    name: string;
    direction: { stop_area: StopArea };
    line: Line;
  };
  stop_date_time: {
    departure_date_time: string;
    base_departure_date_time: string;
    arrival_date_time: string;
    data_freshness: "realtime" | "base_schedule";
  };
  display_informations: {
    direction: string;
    label: string;
    color: string;
    text_color: string;
    commercial_mode: string;
    description: string;
    physical_mode: string;
    headsign: string;
    network: string;
    code: string;
    equipments: string[];
  };
}

export interface Place {
  id: string;
  name: string;
  quality: number;
  stop_area?: StopArea;
  embedded_type: "stop_area" | "address" | "poi" | "administrative_region";
}

// --- Search ---

export async function searchPlaces(query: string): Promise<Place[]> {
  if (!query || query.length < 2) return [];

  const params = new URLSearchParams({
    q: query,
    count: "20",
    depth: "1",
  });
  // type[] needs to be appended separately (URLSearchParams encodes brackets)
  const url = `${BASE_URL}/places?${params}&type[]=stop_area`;

  const res = await fetch(url, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid API key. Check your preferences.");
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return (data.places ?? []) as Place[];
}

// --- Departures ---

export async function getDepartures(stopAreaId: string): Promise<Departure[]> {
  // Remove "stop_area:" prefix if already there, then format
  const cleanId = stopAreaId.replace(/^stop_area:/, "");
  const encodedId = encodeURIComponent(`stop_area:${cleanId}`);

  const params = new URLSearchParams({
    count: "30",
    depth: "1",
    data_freshness: "realtime",
  });

  const res = await fetch(`${BASE_URL}/stop_areas/${encodedId}/departures?${params}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid API key. Check your preferences.");
    if (res.status === 404) return [];
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return (data.departures ?? []) as Departure[];
}

// --- Disruptions ---

export interface Disruption {
  id: string;
  status: string;
  severity: { name: string; effect: string; color: string };
  messages: Array<{ text: string; channel: { name: string } }>;
  impacted_objects: Array<{
    pt_object: { id: string; name: string; embedded_type: string };
  }>;
  application_periods: Array<{ begin: string; end: string }>;
}

export async function getDisruptions(): Promise<Disruption[]> {
  const now = new Date().toISOString().replace(/[-:]/g, "").split(".")[0];
  const params = new URLSearchParams({
    since: now,
    count: "50",
  });

  const res = await fetch(`${BASE_URL}/disruptions?${params}`, {
    headers: getHeaders(),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error("Invalid API key. Check your preferences.");
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return (data.disruptions ?? []) as Disruption[];
}

// --- Helpers ---

export function parseDateTime(dt: string): Date {
  // Format: 20240304T143000 -> 2024-03-04T14:30:00
  const y = dt.slice(0, 4);
  const mo = dt.slice(4, 6);
  const d = dt.slice(6, 8);
  const h = dt.slice(9, 11);
  const mi = dt.slice(11, 13);
  const s = dt.slice(13, 15);
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}`);
}

export function formatWaitTime(dt: string): string {
  const departure = parseDateTime(dt);
  const now = new Date();
  const diffMs = departure.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 0) return "Departed";
  if (diffMin === 0) return "Approaching";
  if (diffMin === 1) return "1 min";
  return `${diffMin} min`;
}

export function formatTime(dt: string): string {
  const date = parseDateTime(dt);
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function getModeIcon(commercialMode: string): Icon {
  const mode = commercialMode.toLowerCase();
  if (mode.includes("métro") || mode.includes("metro")) return Icon.Train;
  if (mode.includes("rer")) return Icon.Train;
  if (mode.includes("tram")) return Icon.Train;
  if (mode.includes("bus")) return Icon.Car;
  if (mode.includes("noctilien")) return Icon.Moon;
  if (mode.includes("transilien") || mode.includes("train")) return Icon.Train;
  return Icon.Car;
}

export function getModeName(commercialMode: string): string {
  const mode = commercialMode.toLowerCase();
  if (mode.includes("métro") || mode.includes("metro")) return "Metro";
  if (mode.includes("rer")) return "RER";
  if (mode.includes("tram")) return "Tram";
  if (mode.includes("bus")) return "Bus";
  if (mode.includes("noctilien")) return "Noctilien";
  if (mode.includes("transilien") || mode.includes("train")) return "Train";
  return "Transit";
}

export function getLineColor(hex: string): string {
  return hex ? `#${hex}` : "#666";
}
