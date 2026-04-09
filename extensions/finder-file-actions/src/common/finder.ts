import { runAppleScript } from "run-applescript";
import path from "path";
import { fsAsync } from "./fs-async";

// check if Finder is the frontmost application
export async function isFinderFrontmost(): Promise<boolean> {
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        set frontApp to name of first application process whose frontmost is true
        if frontApp is "Finder" then
          return true
        else
          return false
        end if
      end tell
    `);
    return result.trim() === "true";
  } catch (error) {
    console.error("Error checking if Finder is frontmost:", error);
    return false;
  }
}

// get the POSIX path of the current Finder window's target directory
// falls back to Desktop if no Finder window is open
export async function getCurrentFinderDirectory(): Promise<string> {
  try {
    const result = await runAppleScript(`
      tell application "Finder"
        if (count of Finder windows) > 0 then
          set theTarget to (target of front Finder window) as alias
          return POSIX path of theTarget
        else
          return POSIX path of (path to desktop folder)
        end if
      end tell
    `);
    const dir = result.trim().replace(/\/$/, "");
    return dir || path.join(process.env.HOME || "/", "Desktop");
  } catch {
    return path.join(process.env.HOME || "/", "Desktop");
  }
}

// select an item in Finder so user can rename it with Enter
export async function selectInFinder(itemPath: string): Promise<void> {
  try {
    await runAppleScript(`
      tell application "Finder"
        activate
        set theItem to (POSIX file "${itemPath.replace(/"/g, '\\"')}") as alias
        select theItem
      end tell
    `);
  } catch (error) {
    console.error("Error selecting item in Finder:", error);
  }
}

// generate a unique name following macOS convention:
// "name", "name 2", "name 3" (skips 1)
export async function generateUniqueName(directory: string, baseName: string, extension?: string): Promise<string> {
  const buildPath = (name: string) => {
    if (extension) {
      return path.join(directory, `${name}.${extension}`);
    }
    return path.join(directory, name);
  };

  // try the base name first
  const firstPath = buildPath(baseName);
  if (!(await fsAsync.exists(firstPath))) {
    return path.basename(firstPath);
  }

  // try "name 2", "name 3", etc.
  let counter = 2;
  while (counter < 1000) {
    const candidate = buildPath(`${baseName} ${counter}`);
    if (!(await fsAsync.exists(candidate))) {
      return path.basename(candidate);
    }
    counter++;
  }

  // fallback with timestamp
  const timestamp = Date.now();
  return path.basename(buildPath(`${baseName} ${timestamp}`));
}
