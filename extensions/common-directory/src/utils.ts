import fs from "fs";
import { runAppleScript } from "run-applescript";
import { getPreferenceValues } from "@raycast/api";
import { Values } from "@raycast/api/types/api/app/localStorage";
import { DirectoryType } from "./directory-info";

export const preferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    sortBy: preferencesMap.get("SortBy"),
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
    const finderPath = await runAppleScript(scriptFinderPath);
    return finderPath.slice(0, -1);
  } catch (e) {
    console.log(String(e));
    return "Not running";
  }
};

export const checkPathValid = (path: string) => {
  try {
    fs.accessSync(path);
    return true;
  } catch (e) {
    return false;
  }
};

export const getDirectoryName = (path: string) => {
  const obj = path.lastIndexOf("/");
  return path.substring(obj + 1);
};

export const isDirectoryOrFile = (path: string) => {
  try {
    const stat = fs.lstatSync(path);
    if (stat.isDirectory()) {
      return DirectoryType.DIRECTORY;
    }
    if (stat.isFile()) {
      return DirectoryType.FILE;
    }
  } catch (e) {
    return DirectoryType.DIRECTORY;
  }
  return DirectoryType.DIRECTORY;
};
