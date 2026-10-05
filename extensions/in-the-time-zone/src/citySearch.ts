import { findFromCityStateProvince, cityMapping, CityData } from "city-timezones";
import { TimeZoneEntry } from "./timezones";

export type { CityData };

// ID format: "timezone|cityName" (e.g., "America/Los_Angeles|San Francisco")
export function createCityId(timezone: string, cityName: string): string {
  return `${timezone}|${cityName}`;
}

export function parseCityId(id: string): { timezone: string; cityName: string } {
  const pipeIndex = id.indexOf("|");
  if (pipeIndex === -1) {
    // Legacy format (just timezone) - extract city name from timezone
    const parts = id.split("/");
    return { timezone: id, cityName: parts[parts.length - 1].replace(/_/g, " ") };
  }
  return {
    timezone: id.substring(0, pipeIndex),
    cityName: id.substring(pipeIndex + 1),
  };
}

const SPECIAL_TIMEZONES: TimeZoneEntry[] = [{ id: "Etc/UTC|UTC", label: "UTC (GMT+0)" }];

export function searchCities(query: string, limit = 20): TimeZoneEntry[] {
  if (!query.trim()) return [];

  const q = query.toLowerCase().trim();
  const specialMatches = SPECIAL_TIMEZONES.filter(
    (tz) => tz.label.toLowerCase().includes(q) || tz.id.toLowerCase().includes(q),
  );

  const results = findFromCityStateProvince(query);
  const seen = new Set<string>();

  const cityResults = results
    .filter((city) => {
      const key = `${city.timezone}-${city.city}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return city.timezone;
    })
    .slice(0, limit - specialMatches.length)
    .map((city) => ({
      id: createCityId(city.timezone, city.city),
      label: formatCityLabel(city),
    }));

  return [...specialMatches, ...cityResults];
}

export function lookupCity(id: string): CityData | undefined {
  const { timezone, cityName } = parseCityId(id);
  // Try exact match first
  const exact = cityMapping.find((c) => c.timezone === timezone && c.city === cityName);
  if (exact) return exact;
  // Fallback to timezone-only match
  return cityMapping.find((c) => c.timezone === timezone);
}

function formatCityLabel(city: CityData): string {
  if (city.province && city.province !== city.city) {
    return `${city.city}, ${city.province}, ${city.country}`;
  }
  return `${city.city}, ${city.country}`;
}
