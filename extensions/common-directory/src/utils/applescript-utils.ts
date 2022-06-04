import { runAppleScript } from "run-applescript";
import { DirectoryInfo, DirectoryType } from "../types/directory-info";
import { getDirectoryName, isEmpty } from "./common-utils";

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
    const chosenPath = await runAppleScript(scriptChooseFolder);
    finderPath = isEmpty(chosenPath) ? "" : chosenPath.slice(0, -1);
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
