import { getPreferenceValues } from "@raycast/api";
import type { QuickShellSettings } from "./schema";
import { type ExtensionPreferences, preferencesToSettings } from "./preferences";

export type { ExtensionPreferences } from "./preferences";
export { preferencesToSettings } from "./preferences";

export function getQuickShellSettingsFromPreferences(): QuickShellSettings {
  return preferencesToSettings(getPreferenceValues<ExtensionPreferences>());
}
