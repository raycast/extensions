import { getPreferenceValues, LocalStorage } from "@raycast/api";
import Values = LocalStorage.Values;

export const commonPreferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    advanceView: preferencesMap.get("advanceView") as boolean,
  };
};

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};
