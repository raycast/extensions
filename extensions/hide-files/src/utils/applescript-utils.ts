import { runAppleScript } from "run-applescript";

export const scriptFinderPath = `
if application "Finder" is not running then
    return "Finder not running"
end if

tell application "Finder"
    return POSIX path of ((insertion location) as alias)
end tell
`;

export const getFinderPath = async () => {
  try {
    return await runAppleScript(scriptFinderPath);
  } catch (e) {
    console.error("Error getting Finder path:", e);
    return "Finder not running";
  }
};
