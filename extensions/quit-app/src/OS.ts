import { runAppleScript } from "run-applescript";

export const getOSRunninApps = () => runAppleScript(`
  tell application "Finder"
    get the bundle identifier of every process whose visible is true
  end tell
`); 

export const quitAppById = (bundleId: string) => runAppleScript(`
  tell application id "${bundleId}"
    quit
  end tell
`);