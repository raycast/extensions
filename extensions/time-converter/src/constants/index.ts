// File: src/constants/index.ts

import { NORTH_AMERICA } from "./north-america";
import { SOUTH_AMERICA } from "./south-america";
import { EUROPE, EUROPE_ALIASES } from "./europe";
import { AFRICA, AFRICA_ALIASES } from "./africa";
import {
  ASIA,
  ASIA_OCEANIA_ALIASES,
  REGIONAL_TIMEZONE_ABBREVIATIONS,
} from "./asia-detailed";
import { OCEANIA } from "./oceania";

// Combine all timezone aliases into a single map
export const ALL_TIMEZONE_ALIASES = new Map([
  ...Array.from(EUROPE_ALIASES.entries()),
  ...Array.from(AFRICA_ALIASES.entries()),
  ...Array.from(ASIA_OCEANIA_ALIASES.entries()),
  ...Array.from(REGIONAL_TIMEZONE_ABBREVIATIONS.entries()),
  // Common North American abbreviations
  ["EST", "America/New_York"],
  ["EDT", "America/New_York"],
  ["CST", "America/Chicago"],
  ["CDT", "America/Chicago"],
  ["MST", "America/Denver"],
  ["MDT", "America/Denver"],
  ["PST", "America/Los_Angeles"],
  ["PDT", "America/Los_Angeles"],
  ["AKST", "America/Anchorage"],
  ["AKDT", "America/Anchorage"],
  ["HST", "Pacific/Honolulu"],
  // Common city codes
  ["NYC", "America/New_York"],
  ["LAX", "America/Los_Angeles"],
  ["CHI", "America/Chicago"],
  ["ATL", "America/New_York"],
  ["DFW", "America/Chicago"],
  ["ATX", "America/Chicago"],
]);

// Export all regions
export const ALL_REGIONS = {
  NORTH_AMERICA,
  SOUTH_AMERICA,
  EUROPE,
  AFRICA,
  ASIA,
  OCEANIA,
} as const;

// Type for city entries
export interface CityEntry {
  displayName: string;
  timezone: string;
}

// Function to search across all regions
export function findTimezone(query: string): string | undefined {
  // Check aliases first (case insensitive)
  const aliasMatch = ALL_TIMEZONE_ALIASES.get(query.toUpperCase());
  if (aliasMatch) return aliasMatch;

  // Search through all regions
  const normalizedQuery = query.toLowerCase().trim();

  for (const [regionName, cities] of Object.entries(ALL_REGIONS)) {
    // Try exact match first
    const exactMatch = cities.find(
      (city) => city.displayName.toLowerCase() === normalizedQuery,
    );
    if (exactMatch) return exactMatch.timezone;

    // Try partial match if no exact match found
    const partialMatch = cities.find((city) =>
      city.displayName.toLowerCase().includes(normalizedQuery),
    );
    if (partialMatch) return partialMatch.timezone;
    console.log(regionName);
  }

  return undefined;
}

// Function to get suggestions for a query
export function getSuggestions(query: string, limit = 3): string[] {
  const normalizedQuery = query.toLowerCase().trim();
  const matches: CityEntry[] = [];

  // Search through all regions
  for (const cities of Object.values(ALL_REGIONS)) {
    for (const city of cities) {
      const cityName = city.displayName.toLowerCase();
      if (
        cityName.includes(normalizedQuery) ||
        normalizedQuery.includes(cityName)
      ) {
        matches.push(city);
      }
    }
  }

  // Sort matches by relevance (exact matches first, then by length)
  matches.sort((a, b) => {
    const aName = a.displayName.toLowerCase();
    const bName = b.displayName.toLowerCase();

    // Exact matches come first
    const aExact = aName === normalizedQuery;
    const bExact = bName === normalizedQuery;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;

    // Shorter names come first
    return aName.length - bName.length;
  });

  // Return unique suggestions
  return [...new Set(matches.map((m) => m.displayName))].slice(0, limit);
}

// Default settings
export const DEFAULT_CITIES = ["Austin", "London", "Tokyo"];
export const DEFAULT_FORMAT = "inline";
export const TIME_FORMAT = "h:mm a";

// Export regions individually for direct access
export {
  NORTH_AMERICA,
  SOUTH_AMERICA,
  EUROPE,
  AFRICA,
  ASIA,
  OCEANIA,
  EUROPE_ALIASES,
  AFRICA_ALIASES,
  ASIA_OCEANIA_ALIASES,
  REGIONAL_TIMEZONE_ABBREVIATIONS,
};
