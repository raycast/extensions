import { DirectoryInfo, DirectoryType } from "../types/types";
import { isEmpty } from "./common-utils";
import * as path from "path";
import { Clipboard } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export const copyFileByPath = async (path: string) => {
  await Clipboard.copy({ file: path });
};

const scriptFinderInsertLocation = `
if application "Finder" is not running then
    return "Not running"
end if

tell application "Finder"
    return POSIX path of ((insertion location) as alias)
end tell
`;

// without "/" at the end
export const getFinderInsertLocation = async () => {
  try {
    const finderPath = await runAppleScript(scriptFinderInsertLocation);
    return finderPath.slice(0, -1);
  } catch (e) {
    return "Finder Not running";
  }
};

const scriptFinderWindowPath = `
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
        name: path.parse(value).base,
        path: value,
        type: DirectoryType.FOLDER,
        valid: true,
        rank: 1,
        date: new Date().getTime(),
      });
    });
    return finderPath;
  } catch (e) {
    return finderPath;
  }
};
