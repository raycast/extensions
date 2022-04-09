import fs from "fs-extra";
import { getPreferenceValues, LocalStorage } from "@raycast/api";
import Values = LocalStorage.Values;

export const preferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    openDestDirectory: preferencesMap.get("openDestDirectory"),
    deleteEmptyDirectory: preferencesMap.get("deleteEmptyDirectory"),
    disableWarning: preferencesMap.get("disableWarning"),
  };
};

export const checkDirectoryEmpty = (pathName: string) => {
  try {
    const files = fs.readdirSync(pathName);
    const isNormalFile = files.filter((value) => value.startsWith("."));
    return files.length == isNormalFile.length;
  } catch (e) {
    return false;
  }
};
