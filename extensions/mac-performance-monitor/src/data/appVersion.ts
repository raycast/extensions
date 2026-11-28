/**
 * Reads & checks which version of Mac Performance Monitor is installed.
 */

import { execFile } from "child_process";
import fs from "fs";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Mac Performance Monitor v2.3.0 has everything this extension reads & runs
 */
export const MINIMUM_APP_VERSION = "2.3.0";
export const RELEASES_URL = "https://github.com/Zesty0wl/mac-performance-monitor/releases";
const INFO_PLIST_PATH = "/Applications/Mac Performance Monitor.app/Contents/Info.plist";

/** Returns the installed version (ex. "2.7.0"), or null when the app is not installed. */
export async function readInstalledVersion(): Promise<string | null> {
  if (!fs.existsSync(INFO_PLIST_PATH)) {
    return null;
  }

  const result = await execFileAsync("/usr/bin/plutil", [
    "-extract",
    "CFBundleShortVersionString",
    "raw",
    "-o",
    "-",
    INFO_PLIST_PATH,
  ]);
  return result.stdout.trim();
}

/**
 * True when read version is older than MINIMUM_APP_VERSION.
 */
export function isTooOld(version: string): boolean {
  const parts = version.split(".");
  const minimumParts = MINIMUM_APP_VERSION.split(".");
  const count = Math.max(parts.length, minimumParts.length);

  for (let i = 0; i < count; i++) {
    let part = 0;
    if (i < parts.length) {
      part = Number(parts[i]);
    }

    let minimumPart = 0;
    if (i < minimumParts.length) {
      minimumPart = Number(minimumParts[i]);
    }

    if (part < minimumPart) {
      return true;
    }
    if (part > minimumPart) {
      return false;
    }
  }
  return false;
}
