/** A single file captured in a backup, recorded in the archive's metadata. */
export interface BackupFileEntry {
  /** Path inside the zip, relative to ~/Library (e.g. "Application Support/com.raycast.macos/raycast-enc.sqlite"). */
  entryPath: string;
  bytes: number;
}

/**
 * The only structured data we can honestly produce. The Raycast databases are
 * encrypted, so we cannot read snippet/hotkey counts — metadata is limited to
 * file sizes, versions, timestamps, and a checksum of the archive.
 */
export interface BackupMetadata {
  backupId: string;
  schemaVersion: "2.0";
  deviceName: string;
  deviceId: string;
  raycastVersionAtBackup: string | null;
  macosVersion: string | null;
  /** ISO 8601, e.g. "2026-06-30T14:32:15.123Z". */
  timestamp: string;
  raycastWasRunning: boolean;
  files: BackupFileEntry[];
  totalBytes: number;
  zipBytes: number;
  /** SHA-256 of the uploaded zip, hex-encoded. */
  sha256: string;
  includedActivities: boolean;
  /** We never back up the Keychain decryption key. */
  keychainKeyIncluded: false;
  restoreNote: string;
}

/** A backup as surfaced from Drive: its metadata plus the Drive file IDs to act on. */
export interface DriveBackup {
  metadata: BackupMetadata;
  /** Drive file ID of the .zip archive. */
  zipFileId: string;
  /** Drive file ID of the .meta.json file. */
  metaFileId: string;
  /** Reported size of the zip in Drive, in bytes. */
  zipBytes: number;
}

export interface Preferences {
  googleClientID: string;
  googleClientSecret?: string;
  deviceName?: string;
  keepBackupCount?: string;
  backupActivities: boolean;
  warnIfRunning: boolean;
}
