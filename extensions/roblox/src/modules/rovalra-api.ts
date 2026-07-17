import BetterCache from "./better-cache";

const ROVALRA_API_BASE = "https://apis.rovalra.com";
const CACHE_KEY = "datacenters";
const CACHE_TTL_SECONDS = 60 * 60;

export type DatacenterRegion =
  | "US-EAST"
  | "US-WEST"
  | "US-CENTRAL"
  | "EU"
  | "ASIA"
  | "OCEANIA"
  | "SOUTH-AMERICA"
  | "OTHER";

export interface Datacenter {
  id: number;
  locationId: number;
  city: string;
  state: string;
  country: string;
  countryCode: string;
  region: DatacenterRegion;
}

export type DatacenterMap = Record<number, Datacenter>;

interface RoValraDatacenterEntry {
  location_id: number;
  dataCenterIds: number[];
  location: {
    city: string;
    region: string;
    country: string;
    country_name: string;
    latLong: [string, string];
  };
  inactive: boolean;
}

const datacenterCache = new BetterCache({ namespace: "rovalra-datacenters", defaultTTL: CACHE_TTL_SECONDS });

function determineRegion(countryCode: string, city: string): DatacenterRegion {
  const country = (countryCode || "").toUpperCase();
  const cityLower = (city || "").toLowerCase();

  if (country === "US") {
    const eastCities = ["ashburn", "virginia", "atlanta", "miami", "new york", "newark", "washington", "columbus"];
    const westCities = ["los angeles", "san jose", "seattle", "phoenix", "denver", "las vegas", "boardman"];
    const centralCities = ["dallas", "chicago", "kansas", "houston"];

    if (eastCities.some((c) => cityLower.includes(c))) return "US-EAST";
    if (westCities.some((c) => cityLower.includes(c))) return "US-WEST";
    if (centralCities.some((c) => cityLower.includes(c))) return "US-CENTRAL";
    return "US-EAST";
  }

  if (["DE", "GB", "UK", "NL", "FR", "PL", "IE", "ES", "IT", "SE", "FI", "NO", "DK"].includes(country)) {
    return "EU";
  }

  if (["JP", "SG", "HK", "KR", "IN", "TW", "TH", "MY", "ID", "PH", "VN", "CN"].includes(country)) {
    return "ASIA";
  }

  if (["AU", "NZ"].includes(country)) {
    return "OCEANIA";
  }

  if (["BR", "CL", "AR", "CO", "PE", "MX"].includes(country)) {
    return "SOUTH-AMERICA";
  }

  return "OTHER";
}

function parseDatacenterList(entries: RoValraDatacenterEntry[]): DatacenterMap {
  const datacenterMap: DatacenterMap = {};

  for (const entry of entries) {
    if (!entry.dataCenterIds?.length || !entry.location || entry.inactive) {
      continue;
    }

    const loc = entry.location;
    const region = determineRegion(loc.country, loc.city);

    for (const dcId of entry.dataCenterIds) {
      datacenterMap[dcId] = {
        id: dcId,
        locationId: entry.location_id,
        city: loc.city || "Unknown",
        state: loc.region || "",
        country: loc.country_name || loc.country || "Unknown",
        countryCode: loc.country || "",
        region,
      };
    }
  }

  return datacenterMap;
}

export async function fetchDatacenterList(): Promise<DatacenterMap> {
  const cached = datacenterCache.get<DatacenterMap>(CACHE_KEY);
  if (cached && Object.keys(cached).length >= 10) {
    return cached;
  }

  const response = await fetch(`${ROVALRA_API_BASE}/v1/datacenters/list`, {
    headers: {
      "User-Agent": "RobloxRaycastExtension",
    },
  });
  if (!response.ok) {
    if (cached) return cached;
    throw new Error(`Failed to fetch datacenters: ${response.status}`);
  }

  const data = (await response.json()) as RoValraDatacenterEntry[];
  const datacenterMap = parseDatacenterList(data);

  if (Object.keys(datacenterMap).length >= 10) {
    datacenterCache.set(CACHE_KEY, datacenterMap);
  }

  return datacenterMap;
}

export async function getDatacenterById(id: number): Promise<Datacenter | null> {
  const datacenters = await fetchDatacenterList();
  return datacenters[id] ?? null;
}

export function formatDatacenterLocation(datacenter: Datacenter): string {
  const parts: string[] = [];

  if (datacenter.city && datacenter.city !== "Unknown") {
    parts.push(datacenter.city);
  }

  if (datacenter.state) {
    parts.push(datacenter.state);
  }

  if (datacenter.country && datacenter.country !== "Unknown") {
    parts.push(datacenter.country);
  }

  return parts.join(", ") || "Unknown Location";
}

export function formatServerLocation(datacenter: Datacenter): string {
  const location = formatDatacenterLocation(datacenter);
  if (datacenter.region === "OTHER") {
    return location;
  }
  return `${location} (${datacenter.region})`;
}
