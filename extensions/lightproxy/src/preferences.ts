import { getPreferenceValues } from "@raycast/api";

export interface Preferences {
  lightproxyPath: string;
}

/**
 * Get the path to the LightProxy executable
 */
export function getLightproxyPath(): string {
  const preferences = getPreferenceValues<Preferences>();
  return preferences.lightproxyPath || "/Users/exxzo/go/bin/lightproxy";
}
