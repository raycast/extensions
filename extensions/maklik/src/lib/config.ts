import { getPreferenceValues } from "@raycast/api";

import { ExtensionConfig, parsePreferences, RawPreferences } from "./config-core";

export { ConfigValidationError } from "./config-core";
export type { ExtensionConfig, RawPreferences };

export function loadConfig(): ExtensionConfig {
  const preferences = getPreferenceValues<RawPreferences>();
  return parsePreferences(preferences);
}
