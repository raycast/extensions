import { spawnSync } from "child_process";
import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { open, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

const APP_STORE_URL = "macappstore://apps.apple.com/app/id937984704";
const BUNDLE_ID = "com.if.Amphetamine";

/** Amphetamine's `session time remaining` sentinel return codes. */
export const SESSION = {
  INFINITE: 0,
  TRIGGER: -1,
  APP_OR_DATE: -2,
  NONE: -3,
} as const;

/** Is the Amphetamine app installed? */
export function isInstalled(): boolean {
  // Common install locations first (cheap, no shell-out).
  if (existsSync("/Applications/Amphetamine.app") || existsSync(join(homedir(), "Applications/Amphetamine.app"))) {
    return true;
  }
  // Fallback: Spotlight lookup by bundle id. Does not open any window.
  const result = spawnSync("mdfind", [`kMDItemCFBundleIdentifier == "${BUNDLE_ID}"`], { encoding: "utf8" });
  return result.status === 0 && result.stdout.trim().length > 0;
}

/** Open Amphetamine's page in the Mac App Store. */
export async function openInAppStore(): Promise<void> {
  await open(APP_STORE_URL);
}

/**
 * Guard for commands: if Amphetamine isn't installed, open its App Store page,
 * show a HUD, and return false so the caller can bail.
 *
 * These are all no-view commands, so Raycast renders feedback as a HUD (which
 * has no action buttons). We open the store directly rather than offering an
 * un-clickable action.
 */
export async function ensureInstalled(): Promise<boolean> {
  if (isInstalled()) {
    return true;
  }
  await openInAppStore();
  await showHUD("Amphetamine not installed. Opening the App Store.");
  return false;
}

async function tell(command: string): Promise<string> {
  return runAppleScript(`tell application "Amphetamine" to ${command}`);
}

/**
 * Start a session.
 * @param minutes whole minutes; 0 means an infinite session.
 */
export async function startSession(minutes: number, displaySleepAllowed = false): Promise<void> {
  const options =
    minutes <= 0
      ? `{duration:0, interval:0, displaySleepAllowed:${displaySleepAllowed}}`
      : `{duration:${minutes}, interval:minutes, displaySleepAllowed:${displaySleepAllowed}}`;
  await tell(`start new session with options ${options}`);
}

export async function endSession(): Promise<void> {
  await tell("end session");
}

/** Seconds remaining, or one of the SESSION sentinel codes. */
export async function timeRemaining(): Promise<number> {
  return parseInt((await tell("session time remaining")).trim(), 10);
}
