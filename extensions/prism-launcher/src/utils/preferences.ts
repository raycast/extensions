import { getPreferenceValues } from "@raycast/api";

export function getPreferences<T extends keyof Preferences>(key: T): Preferences[T] {
  return getPreferenceValues<Preferences>()[key];
}
