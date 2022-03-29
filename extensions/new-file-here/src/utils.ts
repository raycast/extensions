import { runAppleScript } from "run-applescript";
import { getPreferenceValues } from "@raycast/api";
import { Values } from "@raycast/api/types/api/app/localStorage";

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

const scriptExistsFile = (fileName: string) => `
tell application "Finder"
    set folderPath  to insertion location as alias
    set fileName to ("${fileName}")
    if exists file  (folderPath & fileName as text) then
        return true
    else 
        return false
    end if
end tell
`;

export const checkFileExists = async (fileName: string) => {
  try {
    return stringToBoolean(await runAppleScript(scriptExistsFile(fileName)));
  } catch (e) {
    console.log(String(e));
    return false;
  }
};

const stringToBoolean = (string: string) => {
  return /^true$/i.test(string);
};
