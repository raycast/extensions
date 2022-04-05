import { getPreferenceValues } from "@raycast/api";
import { Values } from "@raycast/api/types/api/app/localStorage";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const preferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    birthday: preferencesMap.get("birthday") as string,
    weekStart: preferencesMap.get("weekStart") as string,
    iconTheme: preferencesMap.get("iconTheme") as string,
  };
};
