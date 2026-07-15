import { getPreferenceValues } from "@raycast/api";

export function getPreferences<T extends keyof Required<Preferences>>(key: T): Required<Preferences>[T] {
  return getPreferenceValues()[key];
}
