import fse from "fs-extra";
import { runAppleScript } from "run-applescript";
import { getPreferenceValues, getSelectedFinderItems, LocalStorage } from "@raycast/api";
import { DirectoryInfo, DirectoryType } from "./directory-info";
import Values = LocalStorage.Values;
import path from "path";

export const commonPreferences = () => {
  const preferencesMap = new Map(Object.entries(getPreferenceValues<Values>()));
  return {
    sortBy: preferencesMap.get("SortBy"),
    showOpenDirectory: preferencesMap.get("showOpenDirectory"),
    primaryAction: preferencesMap.get("primaryAction"),
    openDestDirectory: preferencesMap.get("openDestDirectory"),
    deleteEmptyDirectory: preferencesMap.get("deleteEmptyDirectory"),
  };
};

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

const scriptFinderInsertLocation = `
if application "Finder" is not running then
    return "Not running"
end if

tell application "Finder"
    return POSIX path of ((insertion location) as alias)
end tell
`;

export const getFinderInsertLocation = async () => {
  try {
    const finderPath = await runAppleScript(scriptFinderInsertLocation);
    return finderPath.slice(0, -1);
  } catch (e) {
    return "Finder Not running";
  }
};

export const scriptFinderWindowPath = `
if application "Finder" is not running then
    return "Not running"
end if

tell application "Finder"
    set windowList to windows
    set finderPath to {}
    repeat with _window in windowList
        set the end of finderPath to POSIX path of (folder of _window as alias)
    end repeat
    return finderPath
end tell
`;

export const getOpenFinderWindowPath = async () => {
  const finderPath: DirectoryInfo[] = [];
  try {
    const _finderPath = (await runAppleScript(scriptFinderWindowPath)).split(", ").map((value) => {
      return value.charAt(value.length - 1) === "/" ? value.slice(0, -1) : value;
    });

    Array.from(new Set(_finderPath)).forEach((value) => {
      if (isEmpty(value)) return;
      finderPath.push({
        id: value,
        name: getDirectoryName(value),
        alias: "",
        path: value,
        type: DirectoryType.DIRECTORY,
        valid: true,
        rank: 1,
        rankSendFile: 1,
        isCommon: false,
        date: new Date().getTime(),
      });
    });
    return finderPath;
  } catch (e) {
    return finderPath;
  }
};

const scriptChooseFolder = `
if application "Finder" is not running then
    return "Not running"
end if

return POSIX path of (choose folder)
`;

export const getChooseFolder = async () => {
  let finderPath = "";
  try {
    finderPath = (await runAppleScript(scriptChooseFolder)).slice(0, -1);
    return finderPath;
  } catch (e) {
    return finderPath;
  }
};

const scriptCopyFile = (path: string) => {
  return `tell app "Finder" to set the clipboard to (POSIX file "${path}")`;
};

export const copyFileByPath = async (path: string) => {
  try {
    await runAppleScript(scriptCopyFile(path));
    return "";
  } catch (e) {
    return String(e);
  }
};

export const getSelectedDirectory = async () => {
  const selectedFile: string[] = [];
  try {
    const selectedFinderItem = await getSelectedFinderItems();
    selectedFinderItem.forEach((value) => {
      const stat = fse.lstatSync(value.path);
      if (stat.isDirectory()) {
        selectedFile.push(value.path);
      }
    });
    return selectedFile;
  } catch (e) {
    return selectedFile;
  }
};

export const getDirectoryName = (directoryPath: string) => {
  return path.parse(directoryPath).base;
};

export const isDirectoryOrFile = (path: string) => {
  try {
    const stat = fse.lstatSync(path);
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

export const checkDirectoryEmpty = (pathName: string) => {
  try {
    const files = fse.readdirSync(pathName);
    const isNormalFile = files.filter((value) => value.startsWith("."));
    return files.length == isNormalFile.length;
  } catch (e) {
    return false;
  }
};
