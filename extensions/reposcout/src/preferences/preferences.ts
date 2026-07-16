import { getPreferenceValues } from "@raycast/api";
import { resolvePreferences } from "./parse";
import type { ResolvedPreferences } from "./types";

/**
 * Thin Raycast adapter that reads extension preferences and resolves them via
 * the pure {@link resolvePreferences}. This is the only file in the preferences
 * layer that touches the Raycast API, keeping the parsing logic testable.
 *
 * `Preferences` is the type auto-generated from the manifest into
 * `raycast-env.d.ts`, so the shape stays in sync with `package.json`.
 */
export function loadPreferences(): ResolvedPreferences {
  return resolvePreferences(getPreferenceValues<Preferences>());
}
