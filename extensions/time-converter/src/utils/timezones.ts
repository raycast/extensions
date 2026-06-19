import {
  TIMEZONE_ALIASES,
  ALL_IANA_TIMEZONES,
  ianaToDisplayName,
  getIanaSuggestions,
} from "../constants";

interface TimezoneResult {
  success: boolean;
  timezone?: string;
  error?: string;
  suggestions?: string[];
}

/**
 * Resolves a user-supplied location string to an IANA timezone identifier.
 *
 * Resolution order:
 * 1. Alias map — abbreviations, city names, airport codes, informal names
 * 2. Exact match against IANA display names (e.g. "New York" → America/New_York)
 * 3. Partial match against IANA display names
 * 4. Partial match against full IANA identifiers (e.g. "America/Chicago")
 *
 * All matching is case-insensitive. Returns suggestions if no match is found.
 */
export function resolveTimezone(input: string): TimezoneResult {
  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();
  const lower = trimmed.toLowerCase();

  // 1. Alias map (handles abbreviations, city names, airport codes, etc.)
  const aliasMatch = TIMEZONE_ALIASES.get(upper);
  if (aliasMatch) {
    return { success: true, timezone: aliasMatch };
  }

  // 2. Exact match against IANA display names ("New York" → America/New_York)
  const exactMatch = ALL_IANA_TIMEZONES.find(
    (tz) => ianaToDisplayName(tz).toLowerCase() === lower,
  );
  if (exactMatch) {
    return { success: true, timezone: exactMatch };
  }

  // 3. Partial match against IANA display names
  const partialDisplayMatch = ALL_IANA_TIMEZONES.find((tz) =>
    ianaToDisplayName(tz).toLowerCase().includes(lower),
  );
  if (partialDisplayMatch) {
    return { success: true, timezone: partialDisplayMatch };
  }

  // 4. Partial match against full IANA identifier
  const partialIanaMatch = ALL_IANA_TIMEZONES.find((tz) =>
    tz.toLowerCase().includes(lower),
  );
  if (partialIanaMatch) {
    return { success: true, timezone: partialIanaMatch };
  }

  // No match — collect suggestions from both alias keys and IANA display names
  const suggestions = buildSuggestions(lower);
  return {
    success: false,
    error: `Could not find time zone for "${trimmed}"`,
    suggestions: suggestions.length > 0 ? suggestions : undefined,
  };
}

/**
 * Builds a list of suggested location names for a failed query.
 * Searches alias keys and IANA display names for partial matches.
 */
function buildSuggestions(normalizedQuery: string): string[] {
  const matches = new Set<string>();

  // Suggestions from alias keys
  for (const key of TIMEZONE_ALIASES.keys()) {
    const keyLower = key.toLowerCase();
    if (
      keyLower.includes(normalizedQuery) ||
      normalizedQuery.includes(keyLower)
    ) {
      // Return the alias key in title case as a readable suggestion
      matches.add(toTitleCase(key));
      if (matches.size >= 3) break;
    }
  }

  // Backfill with IANA display name suggestions if needed
  if (matches.size < 3) {
    for (const s of getIanaSuggestions(normalizedQuery, 3 - matches.size)) {
      matches.add(s);
    }
  }

  return Array.from(matches).slice(0, 3);
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}
