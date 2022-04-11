import { getPreferenceValues, LocalStorage } from "@raycast/api";
import fs from "fs";
import Values = LocalStorage.Values;

export const preferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    screenshotName: preferencesMap.get("screenshotName") as string,
    screenshotFormat: preferencesMap.get("screenshotFormat") as string,
  };
};
export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const checkDirectoryExists = (filePath: string) => {
  try {
    fs.accessSync(filePath);
    return true;
  } catch (e) {
    return false;
  }
};
