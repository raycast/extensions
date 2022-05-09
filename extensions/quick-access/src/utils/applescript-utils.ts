import { runAppleScript } from "run-applescript";

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
