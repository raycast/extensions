import { closeSync, openSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { exec } from "./exec";

/** Privacy & Security → App Management. */
export const APP_MANAGEMENT_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_AppBundles";

/** Privacy & Security → Full Disk Access. */
export const FULL_DISK_SETTINGS = "x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles";

export type PermissionState = "granted" | "denied" | "unknown";

const TCC_DB = join(homedir(), "Library/Application Support/com.apple.TCC/TCC.db");

/** Raycast hosts the extension, so Raycast is the client macOS records. */
const RAYCAST_CLIENT = "com.raycast.macos";

/**
 * A constant query — no value is ever interpolated into it — reading one column
 * of one table, opened read-only.
 */
const APP_MANAGEMENT_QUERY =
  "SELECT client, auth_value FROM access WHERE service = 'kTCCServiceSystemPolicyAppBundles';";

/**
 * Whether Raycast currently has Full Disk Access.
 *
 * macOS exposes no API for this, so the test is whether a file only that
 * permission can open will open. The handle is closed immediately and not a
 * single byte is read — the `open` call alone is what macOS refuses.
 */
export function hasFullDiskAccess(): boolean {
  try {
    closeSync(openSync(TCC_DB, "r"));
    return true;
  } catch {
    return false;
  }
}

/**
 * Whether Raycast currently has App Management.
 *
 * There is no probe for this one: every candidate would have to modify an
 * application bundle. macOS does however record the answer, so the extension
 * reads it back instead of guessing — read-only, one table, and only the rows
 * describing this single permission. That record lives behind Full Disk Access,
 * so without that this is honestly reported as `unknown` rather than assumed.
 *
 * `auth_value` follows Apple's convention: 2 and above is allowed, 0 is denied,
 * and no row at all means it was never granted.
 */
export async function checkAppManagement(): Promise<PermissionState> {
  if (!hasFullDiskAccess()) return "unknown";

  let stdout: string;
  try {
    stdout = await exec("/usr/bin/sqlite3", ["-readonly", TCC_DB, APP_MANAGEMENT_QUERY], 5_000);
  } catch {
    // A failed read is not a denial. Saying so would make the answer flip
    // between polls the moment anything went briefly wrong.
    return "unknown";
  }

  for (const line of stdout.split("\n")) {
    const [client, value] = line.split("|");
    if (client?.trim() !== RAYCAST_CLIENT) continue;
    return Number.parseInt(value, 10) >= 2 ? "granted" : "denied";
  }

  return "denied";
}

export interface Permissions {
  fullDisk: PermissionState;
  appManagement: PermissionState;
}

export async function checkPermissions(): Promise<Permissions> {
  const fullDisk = hasFullDiskAccess();
  return {
    fullDisk: fullDisk ? "granted" : "denied",
    appManagement: await checkAppManagement(),
  };
}

/** True once nothing stands in the way of a complete uninstall. */
export function allGranted({ fullDisk, appManagement }: Permissions): boolean {
  return fullDisk === "granted" && appManagement === "granted";
}

export function samePermissions(a: Permissions | null, b: Permissions | null): boolean {
  return a?.fullDisk === b?.fullDisk && a?.appManagement === b?.appManagement;
}

/**
 * Fold a fresh reading into what we already knew.
 *
 * `unknown` means the question could not be answered this time, not that the
 * answer changed, so a previous definite result survives it. Without this a
 * single hiccup would show up as the permission being revoked and restored.
 */
export function mergePermissions(previous: Permissions | null, next: Permissions): Permissions {
  if (!previous) return next;
  return {
    fullDisk: next.fullDisk === "unknown" ? previous.fullDisk : next.fullDisk,
    appManagement: next.appManagement === "unknown" ? previous.appManagement : next.appManagement,
  };
}
