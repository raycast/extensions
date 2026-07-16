import { getPreferenceValues } from "@raycast/api";
import { resolvePreferences } from "./parse";
import type { RawPreferences, ResolvedPreferences } from "./types";

/**
 * Thin Raycast adapter that reads extension preferences and resolves them via
 * the pure {@link resolvePreferences}. This is the only file in the preferences
 * layer that touches the Raycast API, keeping the parsing logic testable.
 */
export function loadPreferences(): ResolvedPreferences {
  const raw = getPreferenceValues<RawPreferences>();
  return resolvePreferences(raw);
}
