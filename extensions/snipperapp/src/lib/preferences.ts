import { getPreferenceValues } from "@raycast/api";

/**
 * A snippet action that can be chosen as the primary/secondary action.
 * Derived from the auto-generated global `Preferences` type (see raycast-env.d.ts)
 * so it can't drift from the dropdown values declared in package.json.
 */
export type SnippetActionValue = Preferences["primaryAction"];

/** Read the extension preferences (`Preferences` is generated from package.json). */
export function getPrefs(): Preferences {
  return getPreferenceValues<Preferences>();
}
