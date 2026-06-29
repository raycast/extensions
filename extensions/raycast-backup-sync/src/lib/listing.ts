import { getPreferenceValues } from "@raycast/api";
import { ensureDeviceFolder, listFiles, downloadText } from "./google-drive";
import {
  resolveDeviceName,
  ZIP_PREFIX,
  ZIP_SUFFIX,
  META_SUFFIX,
} from "./naming";
import { BackupMetadata, DriveBackup, Preferences } from "./types";

/**
 * List the backups stored for this device, newest first. Pairs each .zip with its
 * .meta.json. If a metadata file is missing or unreadable, we still surface the
 * backup using a best-effort placeholder so it can be restored or deleted.
 */
export async function listDeviceBackups(): Promise<DriveBackup[]> {
  const prefs = getPreferenceValues<Preferences>();
  const deviceName = resolveDeviceName(prefs.deviceName);
  const folderId = await ensureDeviceFolder(deviceName);
  const files = await listFiles(folderId);

  const zips = files.filter(
    (f) => f.name.startsWith(ZIP_PREFIX) && f.name.endsWith(ZIP_SUFFIX),
  );

  const backups = await Promise.all(
    zips.map(async (zip): Promise<DriveBackup> => {
      const base = zip.name.slice(0, -ZIP_SUFFIX.length);
      const metaFile = files.find((f) => f.name === `${base}${META_SUFFIX}`);
      const zipBytes = Number.parseInt(zip.size ?? "0", 10) || 0;

      let metadata: BackupMetadata;
      if (metaFile) {
        try {
          metadata = JSON.parse(
            await downloadText(metaFile.id),
          ) as BackupMetadata;
        } catch {
          metadata = placeholderMetadata(
            deviceName,
            base,
            zip.createdTime,
            zipBytes,
          );
        }
      } else {
        metadata = placeholderMetadata(
          deviceName,
          base,
          zip.createdTime,
          zipBytes,
        );
      }

      return {
        metadata,
        zipFileId: zip.id,
        metaFileId: metaFile?.id ?? "",
        zipBytes,
      };
    }),
  );

  return backups.sort((a, b) =>
    b.metadata.timestamp.localeCompare(a.metadata.timestamp),
  );
}

function placeholderMetadata(
  deviceName: string,
  base: string,
  createdTime: string | undefined,
  zipBytes: number,
): BackupMetadata {
  const timestamp = createdTime ?? new Date(0).toISOString();
  return {
    backupId: base,
    schemaVersion: "2.0",
    deviceName,
    deviceId: "unknown",
    raycastVersionAtBackup: null,
    macosVersion: null,
    timestamp,
    raycastWasRunning: false,
    files: [],
    totalBytes: 0,
    zipBytes,
    sha256: "",
    includedActivities: false,
    keychainKeyIncluded: false,
    restoreNote: "Metadata unavailable for this backup.",
  };
}
