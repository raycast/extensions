//with / at the end
import { runAppleScript } from "run-applescript";

export const scriptFinderPath = `
if application "Finder" is not running then
    return "Finder not running"
end if

tell application "Finder"
    return POSIX path of ((insertion location) as alias)
end tell
`;

export const getFocusFinderPath = async () => {
  try {
    return await runAppleScript(scriptFinderPath);
  } catch (e) {
    return "Finder not running";
  }
};

export const scriptToggleFinderFileVisibility = (visibility: boolean) => `
if application "Finder" is not running then
    return "Finder not running"
end if

tell application "Finder" to quit    
tell application "System Events" to do shell script "defaults write com.apple.finder AppleShowAllFiles -bool ${visibility}"
tell application "Finder" to launch
`;

export const toggleFinderFilesVisibility = async (visibility: boolean) => {
  try {
    return await runAppleScript(scriptToggleFinderFileVisibility(visibility));
  } catch (e) {
    return "Finder not running";
  }
};

export const scriptReadFinderFileVisibility = `
if application "Finder" is not running then
    return "Finder not running"
end if

tell application "System Events" to do shell script "defaults read com.apple.finder AppleShowAllFiles"
`;

export const readFinderFilesVisibility = async () => {
  try {
    return await runAppleScript(scriptReadFinderFileVisibility);
  } catch (e) {
    return "Finder not running";
  }
};
