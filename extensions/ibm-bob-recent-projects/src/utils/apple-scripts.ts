import { runAppleScript } from "run-applescript";

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
