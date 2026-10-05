import { getPreferenceValues } from "@raycast/api";

export type PrimaryAction = Preferences["primaryAction"];

export function getPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}
