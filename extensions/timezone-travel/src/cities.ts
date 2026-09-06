export interface City {
  label: string;
  timeZone: string;
}

export interface CityOption extends City {
  keywords: string[];
}

export const DEFAULT_CITIES: City[] = [
  { label: "Warsaw", timeZone: "Europe/Warsaw" },
  { label: "New York", timeZone: "America/New_York" },
  { label: "Austin", timeZone: "America/Chicago" },
  { label: "San Francisco", timeZone: "America/Los_Angeles" },
];

const CITY_ALIASES: Record<string, { label: string; keywords: string[] }> = {
  "America/Chicago": { label: "Austin", keywords: ["Chicago", "Dallas", "Central Time"] },
  "America/Denver": { label: "Denver", keywords: ["Mountain Time"] },
  "America/Los_Angeles": {
    label: "San Francisco",
    keywords: ["Los Angeles", "Seattle", "Pacific Time", "SFO", "LAX"],
  },
  "America/New_York": { label: "New York", keywords: ["NYC", "Boston", "Miami", "Eastern Time"] },
  "America/Sao_Paulo": { label: "São Paulo", keywords: ["Brazil"] },
  "Asia/Calcutta": { label: "Mumbai", keywords: ["Kolkata", "New Delhi", "India"] },
  "Asia/Dubai": { label: "Dubai", keywords: ["Abu Dhabi", "UAE"] },
  "Asia/Hong_Kong": { label: "Hong Kong", keywords: ["HK"] },
  "Asia/Kolkata": { label: "Mumbai", keywords: ["Kolkata", "New Delhi", "India"] },
  "Asia/Shanghai": { label: "Shanghai", keywords: ["Beijing", "China"] },
  "Asia/Singapore": { label: "Singapore", keywords: ["SG"] },
  "Asia/Tokyo": { label: "Tokyo", keywords: ["Japan"] },
  "Australia/Sydney": { label: "Sydney", keywords: ["Australia"] },
  "Europe/Berlin": { label: "Berlin", keywords: ["Germany", "Central European Time"] },
  "Europe/London": { label: "London", keywords: ["UK", "GMT", "British Time"] },
  "Europe/Paris": { label: "Paris", keywords: ["France", "Central European Time"] },
  "Europe/Warsaw": { label: "Warsaw", keywords: ["Poland", "Central European Time"] },
};

export function formatTimeZoneIdentifier(value: string): string {
  return value.replaceAll("_", " ");
}

function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format();
    return true;
  } catch {
    return false;
  }
}

export function buildCityCatalog(timeZones: string[]): CityOption[] {
  const seen = new Set<string>();

  return timeZones.flatMap((timeZone) => {
    if (seen.has(timeZone) || !isValidTimeZone(timeZone)) return [];
    seen.add(timeZone);

    const alias = CITY_ALIASES[timeZone];
    const segments = timeZone.split("/");
    const label = alias?.label ?? formatTimeZoneIdentifier(segments.at(-1) ?? timeZone);

    return [
      {
        label,
        timeZone,
        keywords: [label, ...(alias?.keywords ?? []), formatTimeZoneIdentifier(timeZone)],
      },
    ];
  });
}

let cachedCityCatalog: CityOption[] | undefined;

export function getCityCatalog(): CityOption[] {
  if (cachedCityCatalog) return cachedCityCatalog;

  const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  const timeZones = [...DEFAULT_CITIES.map((city) => city.timeZone), ...supported];
  cachedCityCatalog = buildCityCatalog(timeZones).sort((left, right) =>
    left.label.localeCompare(right.label),
  );
  return cachedCityCatalog;
}

export function addCity(cities: City[], city: City): City[] {
  if (cities.some((item) => item.timeZone === city.timeZone)) return cities;
  return [...cities, city];
}

export function removeCity(cities: City[], timeZone: string): City[] {
  if (cities.length <= 1) return cities;
  return cities.filter((city) => city.timeZone !== timeZone);
}

export function makeAnchor(cities: City[], timeZone: string): City[] {
  const index = cities.findIndex((city) => city.timeZone === timeZone);
  if (index <= 0) return cities;
  return [cities[index], ...cities.slice(0, index), ...cities.slice(index + 1)];
}

export function parseStoredCities(value: string | undefined): City[] {
  if (!value) return [...DEFAULT_CITIES];

  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [...DEFAULT_CITIES];

    const seen = new Set<string>();
    const cities: City[] = [];

    for (const item of parsed) {
      if (!item || typeof item !== "object") continue;
      const label = "label" in item && typeof item.label === "string" ? item.label.trim() : "";
      const timeZone = "timeZone" in item && typeof item.timeZone === "string" ? item.timeZone : "";
      if (!label || !isValidTimeZone(timeZone) || seen.has(timeZone)) continue;

      seen.add(timeZone);
      cities.push({ label, timeZone });
    }

    return cities.length > 0 ? cities : [...DEFAULT_CITIES];
  } catch {
    return [...DEFAULT_CITIES];
  }
}
