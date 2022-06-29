import { getPreferenceValues, LocalStorage } from "@raycast/api";
import Values = LocalStorage.Values;

export const commonPreferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    autoDetect: preferencesMap.get("autoDetect") as boolean,
    priorityDetection: preferencesMap.get("priorityDetection") as string,
    advanceView: preferencesMap.get("advanceView") as boolean,
    advanceViewLocation: preferencesMap.get("advanceViewLocation") as string,
  };
};

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};
