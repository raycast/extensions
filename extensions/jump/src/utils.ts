import { runAppleScript } from "@raycast/utils";

export async function getRunningApplications() {
  const appPaths = (
    await runAppleScript(`tell application "System Events"
        get the POSIX path of application file of every application process whose visible is true
    end tell`)
  ).split(", ");
  return appPaths;
}

export async function getCurrentDirectory() {
  const currentDir = await runAppleScript(`tell application "Finder"
        get POSIX path of (insertion location as alias)
    end tell`);
  return currentDir;
}
