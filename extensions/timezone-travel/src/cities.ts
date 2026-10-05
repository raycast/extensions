import { getCitySnapshot } from "./time";

export interface City {
  label: string;
  timeZone: string;
}

export interface CityOption extends City {
  keywords: string[];
}

interface CityChoice {
  label: string;
  keywords: string[];
}

export const DEFAULT_CITIES: City[] = [
  { label: "Warsaw", timeZone: "Europe/Warsaw" },
  { label: "San Francisco", timeZone: "America/Los_Angeles" },
  { label: "Austin", timeZone: "America/Chicago" },
  { label: "New York", timeZone: "America/New_York" },
];

const CITY_CHOICES: Record<string, CityChoice[]> = {
  "America/Chicago": [
    { label: "Austin", keywords: ["Texas", "United States", "USA", "Central Time", "CST", "CDT"] },
    { label: "Chicago", keywords: ["Illinois", "United States", "USA", "Central Time", "CST", "CDT"] },
    { label: "Dallas", keywords: ["Texas", "United States", "USA", "Central Time", "CST", "CDT"] },
  ],
  "America/Denver": [
    { label: "Denver", keywords: ["Colorado", "United States", "USA", "Mountain Time", "MST", "MDT"] },
  ],
  "America/Los_Angeles": [
    {
      label: "Los Angeles",
      keywords: ["California", "United States", "USA", "Pacific Time", "PST", "PDT", "LAX"],
    },
    {
      label: "San Francisco",
      keywords: ["California", "United States", "USA", "Pacific Time", "PST", "PDT", "SFO"],
    },
    {
      label: "Seattle",
      keywords: ["Washington", "United States", "USA", "Pacific Time", "PST", "PDT", "SEA"],
    },
  ],
  "America/New_York": [
    { label: "Boston", keywords: ["Massachusetts", "United States", "USA", "Eastern Time", "EST", "EDT"] },
    { label: "Miami", keywords: ["Florida", "United States", "USA", "Eastern Time", "EST", "EDT"] },
    {
      label: "New York",
      keywords: ["New York City", "NYC", "United States", "USA", "Eastern Time", "EST", "EDT"],
    },
  ],
  "America/Sao_Paulo": [{ label: "São Paulo", keywords: ["Sao Paulo", "Brazil", "BRT"] }],
  "Asia/Calcutta": [
    { label: "Kolkata", keywords: ["India", "IST"] },
    { label: "Mumbai", keywords: ["India", "Bombay", "IST"] },
    { label: "New Delhi", keywords: ["Delhi", "India", "IST"] },
  ],
  "Asia/Dubai": [
    { label: "Abu Dhabi", keywords: ["United Arab Emirates", "UAE", "Gulf Standard Time"] },
    { label: "Dubai", keywords: ["United Arab Emirates", "UAE", "Gulf Standard Time"] },
  ],
  "Asia/Hong_Kong": [{ label: "Hong Kong", keywords: ["Hong Kong SAR", "HK", "HKT"] }],
  "Asia/Kolkata": [
    { label: "Kolkata", keywords: ["India", "IST"] },
    { label: "Mumbai", keywords: ["India", "Bombay", "IST"] },
    { label: "New Delhi", keywords: ["Delhi", "India", "IST"] },
  ],
  "Asia/Shanghai": [
    { label: "Beijing", keywords: ["China", "China Standard Time", "CST"] },
    { label: "Shanghai", keywords: ["China", "China Standard Time", "CST"] },
  ],
  "Asia/Singapore": [{ label: "Singapore", keywords: ["Singapore", "SG", "SGT"] }],
  "Asia/Tokyo": [{ label: "Tokyo", keywords: ["Japan", "JST"] }],
  "Australia/Sydney": [{ label: "Sydney", keywords: ["Australia", "AEST", "AEDT"] }],
  "Europe/Berlin": [{ label: "Berlin", keywords: ["Germany", "Central European Time", "CET", "CEST"] }],
  "Europe/London": [{ label: "London", keywords: ["United Kingdom", "UK", "GMT", "British Time", "BST"] }],
  "Europe/Paris": [{ label: "Paris", keywords: ["France", "Central European Time", "CET", "CEST"] }],
  "Europe/Warsaw": [{ label: "Warsaw", keywords: ["Poland", "Central European Time", "CET", "CEST"] }],
};

export function formatTimeZoneIdentifier(value: string): string {
  return value.replaceAll("_", " ");
}

export function getCityKey(city: City): string {
  return `${city.timeZone}:${city.label.trim().toLocaleLowerCase("en-US")}`;
}

export function sortCitiesByTimeZone(cities: City[], date: Date): City[] {
  if (cities.length < 2) return [...cities];

  const [anchor, ...otherCities] = cities;
  const localMinutes = new Map<string, number>();
  const getLocalMinutes = (city: City) => {
    const key = city.timeZone;
    const cached = localMinutes.get(key);
    if (cached !== undefined) return cached;

    const snapshot = getCitySnapshot(date, city.timeZone);
    const value = snapshot.daySerial * 1_440 + snapshot.hour * 60;
    localMinutes.set(key, value);
    return value;
  };

  return [
    anchor,
    ...otherCities.sort(
      (left, right) =>
        getLocalMinutes(left) - getLocalMinutes(right) ||
        left.label.localeCompare(right.label) ||
        left.timeZone.localeCompare(right.timeZone),
    ),
  ];
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
  const seenTimeZones = new Set<string>();

  return timeZones.flatMap((timeZone) => {
    if (seenTimeZones.has(timeZone) || !isValidTimeZone(timeZone)) return [];
    seenTimeZones.add(timeZone);

    const segments = timeZone.split("/");
    const identifier = formatTimeZoneIdentifier(timeZone);
    const canonicalLabel = formatTimeZoneIdentifier(segments.at(-1) ?? timeZone);
    const choices = CITY_CHOICES[timeZone] ?? [{ label: canonicalLabel, keywords: [] }];

    return choices.map((choice) => ({
      label: choice.label,
      timeZone,
      keywords: [...new Set([choice.label, ...choice.keywords, identifier])],
    }));
  });
}

let cachedCityCatalog: CityOption[] | undefined;

export function getCityCatalog(): CityOption[] {
  if (cachedCityCatalog) return cachedCityCatalog;

  const supported = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  const timeZones = [...DEFAULT_CITIES.map((city) => city.timeZone), ...supported];
  cachedCityCatalog = buildCityCatalog(timeZones).sort(
    (left, right) => left.label.localeCompare(right.label) || left.timeZone.localeCompare(right.timeZone),
  );
  return cachedCityCatalog;
}

export function addCity(cities: City[], city: City): City[] {
  if (cities.some((item) => getCityKey(item) === getCityKey(city))) return cities;
  return [...cities, city];
}

export function removeCity(cities: City[], city: City): City[] {
  if (cities.length <= 1) return cities;
  const key = getCityKey(city);
  return cities.filter((item) => getCityKey(item) !== key);
}

export function makeAnchor(cities: City[], city: City): City[] {
  const key = getCityKey(city);
  const index = cities.findIndex((item) => getCityKey(item) === key);
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
      const city = { label, timeZone };
      const key = getCityKey(city);
      if (!label || !isValidTimeZone(timeZone) || seen.has(key)) continue;

      seen.add(key);
      cities.push(city);
    }

    return cities.length > 0 ? cities : [...DEFAULT_CITIES];
  } catch {
    return [...DEFAULT_CITIES];
  }
}
