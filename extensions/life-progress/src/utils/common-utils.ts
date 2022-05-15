import { getPreferenceValues, LocalStorage } from "@raycast/api";
import Values = LocalStorage.Values;

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const preferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    showDailyWord: preferencesMap.get("showDailyWord") as boolean,
    timeLeftFirst: preferencesMap.get("timeLeftFirst") as boolean,
    birthday: preferencesMap.get("birthday") as string,
    weekStart: preferencesMap.get("weekStart") as string,
    iconTheme: preferencesMap.get("iconTheme") as string,
  };
};
