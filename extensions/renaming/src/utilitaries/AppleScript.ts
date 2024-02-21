import { spawnSync } from "child_process";
/**
 * Executes an AppleScript on a macOS machine.
 *
 * @param {string} script - The AppleScript to execute.
 * @throws {Error} If the platform is not macOS.
 * @returns {Promise<string>} The standard output of the AppleScript.
 */

export const runAppleScript = async (script: string) => {
  if (process.platform !== "darwin") {
    throw new Error("macOS only");
  }

  const locale = process.env.LC_ALL;
  delete process.env.LC_ALL;
  const { stdout } = spawnSync("osascript", ["-e", script]);
  process.env.LC_ALL = locale;
  return stdout.toString();
};

export const files = runAppleScript(`
tell application "Finder"
  set selectedItems to selection
  set selectedPaths to {}
  repeat with selectedItem in selectedItems
    set end of selectedPaths to (POSIX path of (selectedItem as text))
  end repeat
  return selectedPaths
end tell
`);
