import { getPreferenceValues } from "@raycast/api";

export type TimeFormat = Preferences["timeFormat"];

export function usePreferences() {
  return getPreferenceValues<Preferences>();
}
