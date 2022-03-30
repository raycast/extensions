import { runAppleScript } from "run-applescript";
import { getPreferenceValues } from "@raycast/api";
import { Values } from "@raycast/api/types/api/app/localStorage";
import fs from "fs";

export const preferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    showDocument: preferencesMap.get("show_document"),
    showCode: preferencesMap.get("show_code"),
    showScript: preferencesMap.get("show_script"),
  };
};

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

const scriptFinderPath = `
if application "Finder" is not running then
    return "Not running"
end if

tell application "Finder"
    return POSIX path of ((insertion location) as alias)
end tell
`;

export const getFinderPath = async () => {
  try {
    return await runAppleScript(scriptFinderPath);
  } catch (e) {
    console.log(String(e));
    return "Not running";
  }
};

export const checkFileExists = async (filePath: string) => {
  try {
    fs.accessSync(filePath);
    return true;
  } catch (e) {
    return false;
  }
};
