import type { ZoneInfo } from "./types";
import { timezoneAliases } from "./data/timezones";

/**
 * Resolve a user-friendly timezone input to an IANA timezone ID.
 *
 * Resolution order:
 * 1. Lowercase + trim → check alias map (376 entries)
 * 2. Try as direct IANA identifier (e.g., "America/Los_Angeles")
 * 3. Return undefined if nothing matches
 */
export function resolveTimezone(input: string): string | undefined {
  const normalized = input.trim().toLowerCase();
  if (!normalized) return undefined;

  // 1. Check alias map
  const fromAlias = timezoneAliases.get(normalized);
  if (fromAlias) return fromAlias;

  // 2. Try as IANA identifier
  try {
    new Intl.DateTimeFormat("en", { timeZone: input.trim() });
    return input.trim();
  } catch {
    return undefined;
  }
}

/**
 * Parse a comma-separated zone string (from preferences) into ZoneInfo objects.
 * Skips entries that can't be resolved.
 */
export function resolveZones(input: string): ZoneInfo[] {
  if (!input.trim()) return [];

  return input
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((label) => {
      const timezone = resolveTimezone(label);
      return timezone ? { label, timezone } : null;
    })
    .filter((z): z is ZoneInfo => z !== null);
}
