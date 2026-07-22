import { existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const CHROME_APP = "Google Chrome.app";

/**
 * Resolve the Google Chrome application path for installation detection only.
 * Checks /Applications first, then ~/Applications. Returns undefined if Chrome
 * is not found. The launch command intentionally uses the app name, not this
 * path (that is the form the user validated); this exists to drive a helpful
 * "Chrome not found" empty state.
 */
export function getChromeAppPath(): string | undefined {
  const candidates = [join("/Applications", CHROME_APP), join(homedir(), "Applications", CHROME_APP)];
  return candidates.find((candidate) => existsSync(candidate));
}

/** Chrome's macOS user-data directory. */
export function getUserDataDir(): string {
  return join(homedir(), "Library", "Application Support", "Google", "Chrome");
}

/** Path to Chrome's Local State JSON (the primary profile metadata source). */
export function getLocalStatePath(): string {
  return join(getUserDataDir(), "Local State");
}

/** Absolute path to a single profile's directory. */
export function getProfileDir(directory: string): string {
  return join(getUserDataDir(), directory);
}
