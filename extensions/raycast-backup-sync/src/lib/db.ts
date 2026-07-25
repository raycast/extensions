import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { getPreferenceValues } from "@raycast/api";
import { BackupMetadata, Preferences, StoredBackup } from "./types";

/**
 * Storage over the user's own Neon Postgres database. One table holds both the
 * backup metadata and the archive bytes (as bytea) — no separate object storage,
 * no OAuth, no per-user cloud project. The user only ever supplies a connection
 * string.
 */

let cached: {
  connectionString: string;
  sql: NeonQueryFunction<false, false>;
} | null = null;

function sql(): NeonQueryFunction<false, false> {
  const prefs = getPreferenceValues<Preferences>();
  const connectionString = prefs.neonConnectionString?.trim();
  if (!connectionString) {
    throw new Error(
      "Missing Neon connection string. Set it in this extension's preferences.",
    );
  }
  if (cached?.connectionString !== connectionString) {
    cached = { connectionString, sql: neon(connectionString) };
  }
  return cached.sql;
}

let schemaEnsured = false;

/** Create the backups table on first use. Safe to call repeatedly. */
export async function ensureSchema(): Promise<void> {
  if (schemaEnsured) return;
  const db = sql();
  await db`
    CREATE TABLE IF NOT EXISTS raycast_backups (
      id UUID PRIMARY KEY,
      device_name TEXT NOT NULL,
      device_id TEXT NOT NULL,
      timestamp TIMESTAMPTZ NOT NULL,
      raycast_version TEXT,
      macos_version TEXT,
      raycast_was_running BOOLEAN NOT NULL,
      included_activities BOOLEAN NOT NULL,
      total_bytes BIGINT NOT NULL,
      zip_bytes BIGINT NOT NULL,
      sha256 TEXT NOT NULL,
      files JSONB NOT NULL,
      restore_note TEXT NOT NULL,
      archive BYTEA NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
  await db`
    CREATE INDEX IF NOT EXISTS raycast_backups_device_idx
      ON raycast_backups (device_name, timestamp DESC)
  `;
  schemaEnsured = true;
}

/** Insert a backup row: metadata plus the archive bytes. */
export async function insertBackup(
  metadata: BackupMetadata,
  archive: Buffer,
): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`
    INSERT INTO raycast_backups (
      id, device_name, device_id, timestamp, raycast_version, macos_version,
      raycast_was_running, included_activities, total_bytes, zip_bytes, sha256,
      files, restore_note, archive
    ) VALUES (
      ${metadata.backupId}, ${metadata.deviceName}, ${metadata.deviceId},
      ${metadata.timestamp}, ${metadata.raycastVersionAtBackup}, ${metadata.macosVersion},
      ${metadata.raycastWasRunning}, ${metadata.includedActivities}, ${metadata.totalBytes},
      ${metadata.zipBytes}, ${metadata.sha256}, ${JSON.stringify(metadata.files)},
      ${metadata.restoreNote}, ${archive}
    )
  `;
}

interface BackupRow {
  id: string;
  device_name: string;
  device_id: string;
  timestamp: string;
  raycast_version: string | null;
  macos_version: string | null;
  raycast_was_running: boolean;
  included_activities: boolean;
  total_bytes: string;
  zip_bytes: string;
  sha256: string;
  files: BackupMetadata["files"];
  restore_note: string;
}

function rowToBackup(row: BackupRow): StoredBackup {
  return {
    id: row.id,
    zipBytes: Number(row.zip_bytes),
    metadata: {
      backupId: row.id,
      schemaVersion: "2.0",
      deviceName: row.device_name,
      deviceId: row.device_id,
      raycastVersionAtBackup: row.raycast_version,
      macosVersion: row.macos_version,
      timestamp: new Date(row.timestamp).toISOString(),
      raycastWasRunning: row.raycast_was_running,
      files: row.files,
      totalBytes: Number(row.total_bytes),
      zipBytes: Number(row.zip_bytes),
      sha256: row.sha256,
      includedActivities: row.included_activities,
      keychainKeyIncluded: false,
      restoreNote: row.restore_note,
    },
  };
}

/** List backups for a device, newest first. Excludes the archive bytes. */
export async function listBackupsForDevice(
  deviceName: string,
): Promise<StoredBackup[]> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT id, device_name, device_id, timestamp, raycast_version, macos_version,
           raycast_was_running, included_activities, total_bytes, zip_bytes, sha256, files, restore_note
    FROM raycast_backups
    WHERE device_name = ${deviceName}
    ORDER BY timestamp DESC
  `) as BackupRow[];
  return rows.map(rowToBackup);
}

/** Fetch the archive bytes for a backup, plus its checksum for verification. */
export async function downloadBackupArchive(
  id: string,
): Promise<{ archive: Buffer; sha256: string } | null> {
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT archive, sha256 FROM raycast_backups WHERE id = ${id}
  `) as { archive: string; sha256: string }[];
  const row = rows[0];
  if (!row) return null;
  return { archive: bytea(row.archive), sha256: row.sha256 };
}

/** Neon's HTTP driver returns bytea as a "\\x"-prefixed hex string. */
function bytea(value: string): Buffer {
  return Buffer.from(value.replace(/^\\x/, ""), "hex");
}

export async function deleteBackup(id: string): Promise<void> {
  await ensureSchema();
  const db = sql();
  await db`DELETE FROM raycast_backups WHERE id = ${id}`;
}
