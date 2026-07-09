import { getPreferenceValues } from "@raycast/api";

/**
 * Returns the extension's preferences. `Preferences` is the global type
 * auto-generated from package.json in `raycast-env.d.ts`, so it never drifts
 * out of sync with the manifest.
 */
export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}
