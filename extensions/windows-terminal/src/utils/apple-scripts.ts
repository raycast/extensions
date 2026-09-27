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

export async function getCurrentFinderPath(): Promise<string> {
  return await runAppleScript(getCurrentFinderPathScript);
}
