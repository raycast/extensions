import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ACCESSIBILITY_SETTINGS_PATH = "System Settings > Privacy & Security > Accessibility";
const ACCESSIBILITY_ERROR_PREFIX = "Raycast needs Accessibility permission to trigger Blip via Finder Services.";

export async function sendPathToBlip(path: string) {
  if (!path) {
    throw new Error("Choose a file or folder first.");
  }

  if (!existsSync(path)) {
    throw new Error(`Path does not exist: ${path}`);
  }

  const script = [
    'tell application "Finder" to activate',
    `tell application "Finder" to reveal POSIX file ${quoted(path)}`,
    `tell application "Finder" to select POSIX file ${quoted(path)}`,
    'tell application "System Events" to tell process "Finder" to click menu item "Blip…" of menu 1 of menu item "Services" of menu 1 of menu bar item "Finder" of menu bar 1',
  ];

  try {
    for (const line of script) {
      await execFileAsync("/usr/bin/osascript", ["-e", line]);
    }
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown AppleScript failure.";
    throw new Error(buildAppleScriptError(details));
  }
}

function quoted(value: string) {
  return JSON.stringify(value);
}

function buildAppleScriptError(details: string) {
  const normalizedDetails = details.toLowerCase();

  if (
    normalizedDetails.includes("not allowed assistive access") ||
    normalizedDetails.includes("not authorised to send keystrokes") ||
    normalizedDetails.includes("not authorized to send apple events")
  ) {
    return `${ACCESSIBILITY_ERROR_PREFIX} Enable Raycast in ${ACCESSIBILITY_SETTINGS_PATH}.`;
  }

  if (
    normalizedDetails.includes("menu item") &&
    normalizedDetails.includes("blip") &&
    normalizedDetails.includes("not found")
  ) {
    return "Blip's Finder service was not found. Make sure Blip is installed and its `Services > Blip…` action is available in Finder.";
  }

  return `Blip could not be triggered from Finder Services. ${details}`;
}
