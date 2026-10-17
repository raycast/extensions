import { getPreferenceValues } from "@raycast/api";

export function keepShelfAfterCompletion(): boolean {
  const preferences = getPreferenceValues<Preferences>();
  return Boolean(preferences.keepShelfAfterCompletion);
}
