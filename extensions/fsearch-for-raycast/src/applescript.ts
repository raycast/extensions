import { execFile } from "node:child_process";

/** Quotes a string for an AppleScript literal. */
export function appleScriptString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Runs AppleScript through osascript and resolves with its output. */
export function runAppleScript(script: string): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile("osascript", ["-e", script], (error, stdout, stderr) => {
      if (error) reject(new Error(stderr.trim() || error.message));
      else resolve(stdout.trim());
    });
  });
}

/**
 * Copies the file into the front Finder window's folder, or onto the Desktop
 * when no window is open, and resolves with that folder's path.
 */
export function pasteFileToFinder(path: string): Promise<string> {
  const script = [
    'tell application "Finder"',
    "activate",
    "try",
    "set destination to target of front Finder window",
    "on error",
    "set destination to desktop",
    "end try",
    `duplicate POSIX file ${appleScriptString(path)} to destination`,
    "return POSIX path of (destination as alias)",
    "end tell",
  ].join("\n");
  return runAppleScript(script);
}
