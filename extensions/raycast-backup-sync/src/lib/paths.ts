import * as os from "os";
import * as path from "path";
import * as fs from "fs";

/**
 * Real, verified Raycast storage layout on macOS (checked 2026-06-30):
 *
 *   ~/Library/Application Support/com.raycast.macos/
 *     raycast-enc.sqlite            (+ -wal, -shm)   ← ENCRYPTED main store
 *     raycast-activities-enc.sqlite (+ -wal, -shm)   ← ENCRYPTED clipboard history
 *     raycast-emoji.sqlite          (+ -wal, -shm)
 *   ~/Library/Preferences/com.raycast.macos.plist    ← window / UI state
 *
 * The decryption key lives in the macOS login Keychain (service "Raycast") and is
 * intentionally NOT part of a backup. All archive entry paths are relative to
 * ~/Library so a restore can map them straight back.
 */

export const LIBRARY_DIR = path.join(os.homedir(), "Library");
export const APP_SUPPORT_DIR = path.join(
  LIBRARY_DIR,
  "Application Support",
  "com.raycast.macos",
);
export const PREFERENCES_PLIST = path.join(
  LIBRARY_DIR,
  "Preferences",
  "com.raycast.macos.plist",
);

/** Base names of a SQLite database and its write-ahead-log companions. */
function sqliteSet(base: string): string[] {
  return [base, `${base}-wal`, `${base}-shm`];
}

const CORE_DBS = [
  ...sqliteSet("raycast-enc.sqlite"),
  ...sqliteSet("raycast-emoji.sqlite"),
];
const ACTIVITY_DBS = sqliteSet("raycast-activities-enc.sqlite");

/**
 * Absolute paths of every file we *might* back up. `-wal`/`-shm` files do not
 * always exist; the caller filters to those present on disk.
 *
 * @param includeActivities whether to include the clipboard-history database.
 */
export function candidateBackupFiles(includeActivities: boolean): string[] {
  const dbNames = includeActivities ? [...CORE_DBS, ...ACTIVITY_DBS] : CORE_DBS;
  const dbPaths = dbNames.map((name) => path.join(APP_SUPPORT_DIR, name));
  return [...dbPaths, PREFERENCES_PLIST];
}

/** The subset of candidate files that actually exist and are readable right now. */
export function existingBackupFiles(includeActivities: boolean): string[] {
  return candidateBackupFiles(includeActivities).filter((p) => {
    try {
      fs.accessSync(p, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  });
}

/** Archive entry path for an absolute file path: relative to ~/Library, POSIX-style. */
export function toEntryPath(absPath: string): string {
  return path.relative(LIBRARY_DIR, absPath).split(path.sep).join("/");
}

/** Map an archive entry path back to an absolute destination under ~/Library. */
export function fromEntryPath(entryPath: string): string {
  return path.join(LIBRARY_DIR, ...entryPath.split("/"));
}

/** True if the Raycast data directory exists — i.e. Raycast is installed here. */
export function raycastDataDirExists(): boolean {
  try {
    return fs.statSync(APP_SUPPORT_DIR).isDirectory();
  } catch {
    return false;
  }
}
