import { getPreferenceValues } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import { existingBackupFiles, raycastDataDirExists } from "./paths";
import { buildArchive, sha256 } from "./archive";
import { insertBackup, listBackupsForDevice, deleteBackup } from "./db";
import {
  getDeviceId,
  getRaycastVersion,
  getMacosVersion,
  isRaycastRunning,
} from "./system";
import { BackupMetadata, Preferences } from "./types";
import { resolveDeviceName, parseKeepCount } from "./naming";

export interface BackupResult {
  metadata: BackupMetadata;
  deletedOldBackups: number;
}

/**
 * Collect the Raycast data files, zip them, and store a versioned archive plus its
 * metadata in Neon Postgres. Applies the per-device retention policy afterwards.
 *
 * @param onProgress optional status callback for UI updates.
 */
export async function runBackup(
  onProgress?: (message: string) => void,
): Promise<BackupResult> {
  const prefs = getPreferenceValues<Preferences>();
  const progress = onProgress ?? (() => {});

  if (!raycastDataDirExists()) {
    throw new Error(
      "Raycast data directory not found. Is Raycast installed on this Mac?",
    );
  }

  const files = existingBackupFiles(prefs.backupActivities);
  if (files.length === 0) {
    throw new Error("No Raycast data files were found to back up.");
  }

  progress("Reading Raycast data files…");
  const running = await isRaycastRunning();
  const { buffer, entries } = buildArchive(files);
  const checksum = sha256(buffer);

  progress("Gathering backup metadata…");
  const [deviceId, raycastVersion, macosVersion] = await Promise.all([
    getDeviceId(),
    getRaycastVersion(),
    getMacosVersion(),
  ]);
  const deviceName = resolveDeviceName(prefs.deviceName);
  const timestamp = new Date().toISOString();

  const metadata: BackupMetadata = {
    backupId: uuidv4(),
    schemaVersion: "2.0",
    deviceName,
    deviceId,
    raycastVersionAtBackup: raycastVersion,
    macosVersion,
    timestamp,
    raycastWasRunning: running,
    files: entries,
    totalBytes: entries.reduce((sum, e) => sum + e.bytes, 0),
    zipBytes: buffer.length,
    sha256: checksum,
    includedActivities: prefs.backupActivities,
    keychainKeyIncluded: false,
    restoreNote:
      "Encrypted databases require the original machine's Keychain key to open. " +
      "Restore on the same Mac that created this backup.",
  };

  progress("Uploading to Neon Postgres…");
  await insertBackup(metadata, buffer);

  progress("Applying retention policy…");
  const deletedOldBackups = await applyRetention(
    deviceName,
    parseKeepCount(prefs.keepBackupCount),
  );

  return { metadata, deletedOldBackups };
}

/** Delete the oldest backups beyond `keepCount`. keepCount <= 0 keeps everything. */
async function applyRetention(
  deviceName: string,
  keepCount: number,
): Promise<number> {
  if (keepCount <= 0) return 0;

  const backups = await listBackupsForDevice(deviceName);
  const toDelete = backups.slice(keepCount);
  for (const backup of toDelete) {
    await deleteBackup(backup.id);
  }
  return toDelete.length;
}
