import { getPreferenceValues } from "@raycast/api";

interface Preferences {
  defaultAction: "copy" | "paste";
}

function usePreferences(): Preferences;
function usePreferences<T extends keyof Preferences>(key: T): Preferences[T];
function usePreferences<T extends keyof Preferences>(key?: T) {
  return key ? getPreferenceValues()[key] : getPreferenceValues();
}

export default usePreferences;
