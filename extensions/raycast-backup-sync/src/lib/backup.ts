import { getPreferenceValues } from "@raycast/api";
import { v4 as uuidv4 } from "uuid";
import { existingBackupFiles, raycastDataDirExists } from "./paths";
import { buildArchive, sha256 } from "./archive";
import {
  ensureDeviceFolder,
  uploadFile,
  listFiles,
  deleteFile,
} from "./google-drive";
import {
  getDeviceId,
  getRaycastVersion,
  getMacosVersion,
  isRaycastRunning,
} from "./system";
import { BackupMetadata, Preferences } from "./types";
import {
  resolveDeviceName,
  parseKeepCount,
  ZIP_PREFIX,
  META_SUFFIX,
  ZIP_SUFFIX,
  timestampForName,
} from "./naming";

export interface BackupResult {
  metadata: BackupMetadata;
  deletedOldBackups: number;
}

/**
 * Collect the Raycast data files, zip them, and upload a versioned archive plus its
 * metadata to Google Drive. Applies the per-device retention policy afterwards.
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

  progress("Uploading to Google Drive…");
  const folderId = await ensureDeviceFolder(deviceName);
  const baseName = `${ZIP_PREFIX}${timestampForName(timestamp)}`;
  await uploadFile(
    folderId,
    `${baseName}${ZIP_SUFFIX}`,
    buffer,
    "application/zip",
  );
  await uploadFile(
    folderId,
    `${baseName}${META_SUFFIX}`,
    JSON.stringify(metadata, null, 2),
    "application/json",
  );

  progress("Applying retention policy…");
  const deletedOldBackups = await applyRetention(
    folderId,
    parseKeepCount(prefs.keepBackupCount),
  );

  return { metadata, deletedOldBackups };
}

/** Delete the oldest backups beyond `keepCount`. keepCount <= 0 keeps everything. */
async function applyRetention(
  folderId: string,
  keepCount: number,
): Promise<number> {
  if (keepCount <= 0) return 0;

  const files = await listFiles(folderId);
  // Group by base name (a backup = its .zip + .meta.json), newest first.
  const baseNames = files
    .filter((f) => f.name.startsWith(ZIP_PREFIX) && f.name.endsWith(ZIP_SUFFIX))
    .map((f) => f.name.slice(0, -ZIP_SUFFIX.length))
    .sort()
    .reverse();

  const toDelete = baseNames.slice(keepCount);
  let deleted = 0;
  for (const base of toDelete) {
    for (const suffix of [ZIP_SUFFIX, META_SUFFIX]) {
      const file = files.find((f) => f.name === `${base}${suffix}`);
      if (file) {
        await deleteFile(file.id);
        if (suffix === ZIP_SUFFIX) deleted += 1;
      }
    }
  }
  return deleted;
}
