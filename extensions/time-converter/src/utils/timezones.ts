import { ALL_REGIONS, ALL_TIMEZONE_ALIASES } from "../constants";

interface TimezoneResult {
  success: boolean;
  timezone?: string;
  error?: string;
  suggestions?: string[];
}

/**
 * Enhanced timezone resolution with fuzzy matching and suggestions
 */
export function resolveTimezone(input: string): TimezoneResult {
  const normalized = input.trim();

  // Check direct aliases (including airport codes and abbreviations)
  const aliasMatch = ALL_TIMEZONE_ALIASES.get(normalized.toUpperCase());
  if (aliasMatch) {
    return { success: true, timezone: aliasMatch };
  }

  // Search through all regions
  for (const [regionName, cities] of Object.entries(ALL_REGIONS)) {
    // Try exact match first
    const exactMatch = cities.find(
      (city) => city.displayName.toLowerCase() === normalized.toLowerCase(),
    );
    if (exactMatch) {
      return { success: true, timezone: exactMatch.timezone };
    }

    // Try partial match
    const partialMatch = cities.find((city) =>
      city.displayName.toLowerCase().includes(normalized.toLowerCase()),
    );
    if (partialMatch) {
      return { success: true, timezone: partialMatch.timezone };
    }
    console.log(regionName);
  }

  // If no match found, find similar cities for suggestions
  const allCities = Object.values(ALL_REGIONS).flat();
  const suggestions = allCities
    .filter((city) => {
      const cityName = city.displayName.toLowerCase();
      const searchTerm = normalized.toLowerCase();
      return (
        cityName.includes(searchTerm.substring(0, 3)) ||
        searchTerm.includes(cityName.substring(0, 3))
      );
    })
    .map((city) => city.displayName)
    .slice(0, 3);

  return {
    success: false,
    error: `Could not find time zone for "${input}"`,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}
