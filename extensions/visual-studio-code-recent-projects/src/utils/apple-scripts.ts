import { runAppleScript } from "@raycast/utils";

const getCurrentFinderPathScript = `
try
    tell application "Finder"
        return POSIX path of (insertion location as alias)
    end tell
on error
    return ""
end try
`;

export const getCurrentFinderPath = async () => {
  return await runAppleScript(getCurrentFinderPathScript);
};

export const getSelectedPathFinderItems = async () => {
  const script = `
    tell application "Path Finder"
      set thePaths to {}
      repeat with pfItem in (get selection)
        set the end of thePaths to POSIX path of pfItem
      end repeat
      return thePaths
    end tell
  `;

  const paths = await runAppleScript(script);
  return paths.split(","); // Assuming the paths are comma-separated
};
