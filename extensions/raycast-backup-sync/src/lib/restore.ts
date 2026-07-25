import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { downloadBackupArchive } from "./db";
import { sha256, extractArchive, listArchiveEntries } from "./archive";
import { existingBackupFiles, toEntryPath } from "./paths";
import { getDeviceId } from "./system";
import { StoredBackup } from "./types";
import { timestampForName } from "./naming";

export interface RestoreResult {
  restoredFiles: string[];
  safetyCopyDir: string;
  checksumVerified: boolean;
}

export class DeviceMismatchError extends Error {
  constructor(public readonly backupDeviceId: string) {
    super(
      "This backup was created on a different machine and may not decrypt here.",
    );
    this.name = "DeviceMismatchError";
  }
}

/**
 * Download and restore a backup over the live Raycast data files.
 *
 * Safety measures:
 *  - verifies the archive's SHA-256 against the recorded checksum (when available);
 *  - copies the CURRENT files to a local pre-restore folder before overwriting;
 *  - refuses a backup from a different device unless `allowDeviceMismatch` is set,
 *    because the Keychain decryption key is machine-bound.
 *
 * The caller is responsible for ensuring Raycast is quit first.
 */
export async function runRestore(
  backup: StoredBackup,
  options: { allowDeviceMismatch?: boolean } = {},
  onProgress?: (message: string) => void,
): Promise<RestoreResult> {
  const progress = onProgress ?? (() => {});

  if (!options.allowDeviceMismatch && backup.metadata.deviceId !== "unknown") {
    const currentDeviceId = await getDeviceId();
    if (backup.metadata.deviceId !== currentDeviceId) {
      throw new DeviceMismatchError(backup.metadata.deviceId);
    }
  }

  progress("Downloading archive…");
  const row = await downloadBackupArchive(backup.id);
  if (!row) {
    throw new Error("This backup no longer exists in the database.");
  }
  const buffer = row.archive;

  progress("Verifying integrity…");
  let checksumVerified = false;
  if (row.sha256) {
    const actual = sha256(buffer);
    if (actual !== row.sha256) {
      throw new Error(
        "Checksum mismatch — the downloaded archive is corrupt. Restore aborted.",
      );
    }
    checksumVerified = true;
  }

  progress("Backing up current files…");
  const safetyCopyDir = createSafetyCopy(backup.metadata.includedActivities);

  progress("Restoring files…");
  // Sanity check the archive isn't empty / malformed before we overwrite anything.
  if (listArchiveEntries(buffer).length === 0) {
    throw new Error("Archive contains no files — restore aborted.");
  }
  const restoredFiles = extractArchive(buffer);

  return { restoredFiles, safetyCopyDir, checksumVerified };
}

/** Copy the current Raycast files into a timestamped local folder before overwriting. */
function createSafetyCopy(includeActivities: boolean): string {
  const dir = path.join(
    os.tmpdir(),
    "raycast-backup-sync",
    `pre-restore-${timestampForName(new Date().toISOString())}`,
  );
  fs.mkdirSync(dir, { recursive: true });

  for (const absPath of existingBackupFiles(includeActivities)) {
    const dest = path.join(dir, toEntryPath(absPath));
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(absPath, dest);
  }
  return dir;
}
