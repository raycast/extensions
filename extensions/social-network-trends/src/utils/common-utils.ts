import { getPreferenceValues, LocalStorage } from "@raycast/api";
import Values = LocalStorage.Values;

export const commonPreferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    rememberTag: preferencesMap.get("rememberTag") as boolean,
  };
};

export const listIcon = [
  "list-icon/1.png",
  "list-icon/2.png",
  "list-icon/3.png",
  "list-icon/4.png",
  "list-icon/5.png",
  "list-icon/6.png",
  "list-icon/7.png",
  "list-icon/8.png",
  "list-icon/9.png",
  "list-icon/10.png",
];
export const listIconDark = [
  "list-icon/1@dark.png",
  "list-icon/2@dark.png",
  "list-icon/3@dark.png",
  "list-icon/4@dark.png",
  "list-icon/5@dark.png",
  "list-icon/6@dark.png",
  "list-icon/7@dark.png",
  "list-icon/8@dark.png",
  "list-icon/9@dark.png",
  "list-icon/10@dark.png",
];
