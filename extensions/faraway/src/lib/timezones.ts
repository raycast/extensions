import cityTimezones from "city-timezones";
import { getDiffFromLocalLabel, getGMTOffsetString } from "./time";

export type CityEntry = {
  city: string;
  country: string;
  timezone: string;
};

export const CITIES: CityEntry[] = [
  // Europe
  { city: "Lisbon", country: "Portugal", timezone: "Europe/Lisbon" },
  { city: "Porto", country: "Portugal", timezone: "Europe/Lisbon" },
  { city: "Madrid", country: "Spain", timezone: "Europe/Madrid" },
  { city: "Barcelona", country: "Spain", timezone: "Europe/Madrid" },
  { city: "Paris", country: "France", timezone: "Europe/Paris" },
  { city: "London", country: "United Kingdom", timezone: "Europe/London" },
  { city: "Dublin", country: "Ireland", timezone: "Europe/Dublin" },
  { city: "Amsterdam", country: "Netherlands", timezone: "Europe/Amsterdam" },
  { city: "Berlin", country: "Germany", timezone: "Europe/Berlin" },
  { city: "Munich", country: "Germany", timezone: "Europe/Berlin" },
  { city: "Rome", country: "Italy", timezone: "Europe/Rome" },
  { city: "Milan", country: "Italy", timezone: "Europe/Rome" },
  { city: "Zurich", country: "Switzerland", timezone: "Europe/Zurich" },
  { city: "Vienna", country: "Austria", timezone: "Europe/Vienna" },
  { city: "Prague", country: "Czechia", timezone: "Europe/Prague" },
  { city: "Warsaw", country: "Poland", timezone: "Europe/Warsaw" },
  { city: "Stockholm", country: "Sweden", timezone: "Europe/Stockholm" },
  { city: "Oslo", country: "Norway", timezone: "Europe/Oslo" },
  { city: "Copenhagen", country: "Denmark", timezone: "Europe/Copenhagen" },
  { city: "Helsinki", country: "Finland", timezone: "Europe/Helsinki" },
  { city: "Athens", country: "Greece", timezone: "Europe/Athens" },
  { city: "Istanbul", country: "Turkey", timezone: "Europe/Istanbul" },
  { city: "Moscow", country: "Russia", timezone: "Europe/Moscow" },
  { city: "Brussels", country: "Belgium", timezone: "Europe/Brussels" },
  { city: "Reykjavik", country: "Iceland", timezone: "Atlantic/Reykjavik" },
  // Americas
  { city: "New York", country: "United States", timezone: "America/New_York" },
  { city: "Boston", country: "United States", timezone: "America/New_York" },
  { city: "Washington", country: "United States", timezone: "America/New_York" },
  { city: "Miami", country: "United States", timezone: "America/New_York" },
  { city: "Atlanta", country: "United States", timezone: "America/New_York" },
  { city: "Chicago", country: "United States", timezone: "America/Chicago" },
  { city: "Dallas", country: "United States", timezone: "America/Chicago" },
  { city: "Austin", country: "United States", timezone: "America/Chicago" },
  { city: "Houston", country: "United States", timezone: "America/Chicago" },
  { city: "Denver", country: "United States", timezone: "America/Denver" },
  { city: "Phoenix", country: "United States", timezone: "America/Phoenix" },
  { city: "Los Angeles", country: "United States", timezone: "America/Los_Angeles" },
  { city: "San Francisco", country: "United States", timezone: "America/Los_Angeles" },
  { city: "Seattle", country: "United States", timezone: "America/Los_Angeles" },
  { city: "San Diego", country: "United States", timezone: "America/Los_Angeles" },
  { city: "Anchorage", country: "United States", timezone: "America/Anchorage" },
  { city: "Honolulu", country: "United States", timezone: "Pacific/Honolulu" },
  { city: "Toronto", country: "Canada", timezone: "America/Toronto" },
  { city: "Montreal", country: "Canada", timezone: "America/Toronto" },
  { city: "Vancouver", country: "Canada", timezone: "America/Vancouver" },
  { city: "Mexico City", country: "Mexico", timezone: "America/Mexico_City" },
  { city: "São Paulo", country: "Brazil", timezone: "America/Sao_Paulo" },
  { city: "Rio de Janeiro", country: "Brazil", timezone: "America/Sao_Paulo" },
  { city: "Brasília", country: "Brazil", timezone: "America/Sao_Paulo" },
  { city: "Belo Horizonte", country: "Brazil", timezone: "America/Sao_Paulo" },
  { city: "Recife", country: "Brazil", timezone: "America/Recife" },
  { city: "Manaus", country: "Brazil", timezone: "America/Manaus" },
  { city: "Buenos Aires", country: "Argentina", timezone: "America/Argentina/Buenos_Aires" },
  { city: "Santiago", country: "Chile", timezone: "America/Santiago" },
  { city: "Lima", country: "Peru", timezone: "America/Lima" },
  { city: "Bogotá", country: "Colombia", timezone: "America/Bogota" },
  { city: "Caracas", country: "Venezuela", timezone: "America/Caracas" },
  { city: "Montevideo", country: "Uruguay", timezone: "America/Montevideo" },
  // Africa
  { city: "Cape Town", country: "South Africa", timezone: "Africa/Johannesburg" },
  { city: "Johannesburg", country: "South Africa", timezone: "Africa/Johannesburg" },
  { city: "Lagos", country: "Nigeria", timezone: "Africa/Lagos" },
  { city: "Nairobi", country: "Kenya", timezone: "Africa/Nairobi" },
  { city: "Cairo", country: "Egypt", timezone: "Africa/Cairo" },
  { city: "Casablanca", country: "Morocco", timezone: "Africa/Casablanca" },
  { city: "Accra", country: "Ghana", timezone: "Africa/Accra" },
  // Middle East
  { city: "Dubai", country: "United Arab Emirates", timezone: "Asia/Dubai" },
  { city: "Abu Dhabi", country: "United Arab Emirates", timezone: "Asia/Dubai" },
  { city: "Tel Aviv", country: "Israel", timezone: "Asia/Jerusalem" },
  { city: "Jerusalem", country: "Israel", timezone: "Asia/Jerusalem" },
  { city: "Riyadh", country: "Saudi Arabia", timezone: "Asia/Riyadh" },
  { city: "Doha", country: "Qatar", timezone: "Asia/Qatar" },
  { city: "Tehran", country: "Iran", timezone: "Asia/Tehran" },
  // Asia
  { city: "Mumbai", country: "India", timezone: "Asia/Kolkata" },
  { city: "Delhi", country: "India", timezone: "Asia/Kolkata" },
  { city: "Bangalore", country: "India", timezone: "Asia/Kolkata" },
  { city: "Karachi", country: "Pakistan", timezone: "Asia/Karachi" },
  { city: "Dhaka", country: "Bangladesh", timezone: "Asia/Dhaka" },
  { city: "Colombo", country: "Sri Lanka", timezone: "Asia/Colombo" },
  { city: "Kathmandu", country: "Nepal", timezone: "Asia/Kathmandu" },
  { city: "Bangkok", country: "Thailand", timezone: "Asia/Bangkok" },
  { city: "Ho Chi Minh City", country: "Vietnam", timezone: "Asia/Ho_Chi_Minh" },
  { city: "Hanoi", country: "Vietnam", timezone: "Asia/Ho_Chi_Minh" },
  { city: "Jakarta", country: "Indonesia", timezone: "Asia/Jakarta" },
  { city: "Kuala Lumpur", country: "Malaysia", timezone: "Asia/Kuala_Lumpur" },
  { city: "Singapore", country: "Singapore", timezone: "Asia/Singapore" },
  { city: "Manila", country: "Philippines", timezone: "Asia/Manila" },
  { city: "Hong Kong", country: "Hong Kong", timezone: "Asia/Hong_Kong" },
  { city: "Taipei", country: "Taiwan", timezone: "Asia/Taipei" },
  { city: "Shanghai", country: "China", timezone: "Asia/Shanghai" },
  { city: "Beijing", country: "China", timezone: "Asia/Shanghai" },
  { city: "Shenzhen", country: "China", timezone: "Asia/Shanghai" },
  { city: "Seoul", country: "South Korea", timezone: "Asia/Seoul" },
  { city: "Tokyo", country: "Japan", timezone: "Asia/Tokyo" },
  { city: "Osaka", country: "Japan", timezone: "Asia/Tokyo" },
  // Oceania
  { city: "Sydney", country: "Australia", timezone: "Australia/Sydney" },
  { city: "Melbourne", country: "Australia", timezone: "Australia/Melbourne" },
  { city: "Brisbane", country: "Australia", timezone: "Australia/Brisbane" },
  { city: "Perth", country: "Australia", timezone: "Australia/Perth" },
  { city: "Adelaide", country: "Australia", timezone: "Australia/Adelaide" },
  { city: "Auckland", country: "New Zealand", timezone: "Pacific/Auckland" },
  { city: "Wellington", country: "New Zealand", timezone: "Pacific/Auckland" },
  { city: "Fiji", country: "Fiji", timezone: "Pacific/Fiji" },
];

export function cityLabelFor(entry: CityEntry): string {
  return `${entry.city}, ${entry.country}`;
}

function getAllTimezones(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (kind: string) => string[] };
  if (typeof intl.supportedValuesOf === "function") {
    try {
      return intl.supportedValuesOf("timeZone");
    } catch {
      // ignore
    }
  }
  return [];
}

export type TimezoneSuggestion = {
  /** Unique encoded value used as the Form.Dropdown.Item value. Format: `${timezone}|${label}`. */
  value: string;
  /** Display text. */
  label: string;
  /** IANA timezone. */
  timezone: string;
  /** City label (for storage). For IANA-only entries this equals the timezone. */
  cityLabel: string;
};

const VALUE_SEPARATOR = "|";

export function encodeSuggestionValue(timezone: string, cityLabel: string): string {
  return `${timezone}${VALUE_SEPARATOR}${cityLabel}`;
}

export function decodeSuggestionValue(value: string): { timezone: string; cityLabel: string } {
  const idx = value.indexOf(VALUE_SEPARATOR);
  if (idx === -1) return { timezone: value, cityLabel: value };
  return { timezone: value.slice(0, idx), cityLabel: value.slice(idx + 1) };
}

type WideCityEntry = {
  city: string;
  country: string;
  province?: string;
  timezone: string;
  pop: number;
};

let wideCityCache: WideCityEntry[] | null = null;

function getWideCities(): WideCityEntry[] {
  if (wideCityCache) return wideCityCache;
  const raw = cityTimezones.cityMapping ?? [];
  wideCityCache = raw
    .filter((c) => typeof c.timezone === "string" && c.timezone.length > 0)
    .map((c) => ({
      city: c.city ?? "",
      country: c.country ?? "",
      province: typeof c.province === "string" ? c.province : undefined,
      timezone: c.timezone as string,
      pop: typeof c.pop === "number" ? c.pop : 0,
    }));
  return wideCityCache;
}

function wideEntryLabel(entry: WideCityEntry): string {
  if (entry.province && entry.province !== entry.city) {
    return `${entry.city}, ${entry.province}, ${entry.country}`;
  }
  return `${entry.city}, ${entry.country}`;
}

const MAX_RESULTS = 80;

export function searchTimezones(query: string): TimezoneSuggestion[] {
  const trimmed = query.trim().toLowerCase();
  const seenValues = new Set<string>();
  const results: TimezoneSuggestion[] = [];
  const now = new Date();

  const pushUnique = (timezone: string, cityLabel: string, label: string) => {
    if (results.length >= MAX_RESULTS) return;
    const value = encodeSuggestionValue(timezone, cityLabel);
    if (seenValues.has(value)) return;
    seenValues.add(value);
    results.push({ value, label, timezone, cityLabel });
  };

  const formatLabel = (cityLabel: string, tz: string): string => {
    const gmtOffset = getGMTOffsetString(tz, now);
    const diff = getDiffFromLocalLabel(tz, now);
    return `${cityLabel}  ·  ${gmtOffset} (${diff})`;
  };

  // 1. Empty query: just our curated CITIES (familiar, well-ordered top list).
  if (!trimmed) {
    for (const entry of CITIES) {
      const cityLabel = cityLabelFor(entry);
      pushUnique(entry.timezone, cityLabel, formatLabel(cityLabel, entry.timezone));
    }
    return results;
  }

  // 2. Non-empty query — curated CITIES first (best UX for top metros).
  for (const entry of CITIES) {
    if (
      entry.city.toLowerCase().includes(trimmed) ||
      entry.country.toLowerCase().includes(trimmed) ||
      entry.timezone.toLowerCase().includes(trimmed)
    ) {
      const cityLabel = cityLabelFor(entry);
      pushUnique(entry.timezone, cityLabel, formatLabel(cityLabel, entry.timezone));
    }
  }

  // 3. Wide search against the ~7k-city DB (city-timezones), ranked by population.
  const wideMatches = getWideCities()
    .filter(
      (c) =>
        c.city.toLowerCase().includes(trimmed) ||
        c.country.toLowerCase().includes(trimmed) ||
        (c.province?.toLowerCase().includes(trimmed) ?? false),
    )
    .sort((a, b) => b.pop - a.pop);

  for (const entry of wideMatches) {
    const cityLabel = wideEntryLabel(entry);
    pushUnique(entry.timezone, cityLabel, formatLabel(cityLabel, entry.timezone));
  }

  // 4. IANA timezone substring fallback (last, so direct typing like "Asia/Tokyo" still works).
  for (const tz of getAllTimezones()) {
    if (tz.toLowerCase().includes(trimmed)) {
      pushUnique(tz, tz, formatLabel(tz, tz));
    }
  }

  return results;
}

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz }).format(new Date());
    return true;
  } catch {
    return false;
  }
}
