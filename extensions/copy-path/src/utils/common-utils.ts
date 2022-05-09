import { runAppleScript } from "run-applescript";
import { scriptFinderPath } from "./constants";
import { getPreferenceValues, LocalStorage } from "@raycast/api";
import Values = LocalStorage.Values;

export const commonPreferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    multiPathSeparator: preferencesMap.get("multiPathSeparator") as string,
  };
};

//with / at the end
export const getFocusFinderPath = async () => {
  try {
    return await runAppleScript(scriptFinderPath);
  } catch (e) {
    return "Finder not running";
  }
};
