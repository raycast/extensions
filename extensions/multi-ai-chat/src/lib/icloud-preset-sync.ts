import { randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  readFile,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  DELETED_PRESET_STORAGE_PREFIX,
  deletedPresetStorageKey,
  deserializePreset,
  PRESET_STORAGE_PREFIX,
  presetStorageKey,
  serializeStoredPreset,
  storedPresetUpdatedAt,
  UPDATED_PRESET_STORAGE_PREFIX,
  updatedPresetStorageKey,
  validPresetTimestamp,
  type PromptPreset,
} from "./presets.js";
import {
  PRESET_STORAGE_LOCK_DIRECTORY,
  withPresetStorageLock,
} from "./preset-storage-lock.js";

type StoredValue = string | number | boolean;

export interface SyncStorage {
  allItems(): Promise<Record<string, StoredValue>>;
  setItem(key: string, value: StoredValue): Promise<void>;
  removeItem(key: string): Promise<void>;
}

interface ActiveSyncRecord {
  version: 1;
  id: string;
  updatedAt: number;
  preset: PromptPreset;
}

interface DeletedSyncRecord {
  version: 1;
  id: string;
  updatedAt: number;
  deletedAt: number;
}

type SyncRecord = ActiveSyncRecord | DeletedSyncRecord;

interface SyncOptions {
  directory?: string;
  now?: () => number;
  lockDirectory?: string;
}

export class SyncLocalStorageError extends Error {
  constructor(cause: unknown) {
    super("Could not update the local saved prompt cache", { cause });
  }
}

export const ICLOUD_PRESETS_DIRECTORY = join(
  homedir(),
  "Library",
  "Mobile Documents",
  "com~apple~CloudDocs",
  "Raycast",
  "Multi AI Chat",
  "Presets",
);

export async function synchronizePresetsWithICloud(
  storage: SyncStorage,
  options: SyncOptions = {},
): Promise<void> {
  return withPresetStorageLock(
    options.lockDirectory ?? PRESET_STORAGE_LOCK_DIRECTORY,
    () => synchronize(storage, options),
  );
}

async function synchronize(storage: SyncStorage, options: SyncOptions) {
  const directory = options.directory ?? ICLOUD_PRESETS_DIRECTORY;
  const now = options.now ?? Date.now;
  await mkdir(directory, { recursive: true });

  const [items, remoteRecords] = await Promise.all([
    storage.allItems().catch((error: unknown) => {
      throw new SyncLocalStorageError(error);
    }),
    readRemoteRecords(directory),
  ]);
  const records = mergeRecords(
    localRecords(items, remoteRecords, now),
    remoteRecords,
  );

  for (const record of records.values()) {
    await applyRecord(storage, items, record);
  }
  for (const record of records.values()) {
    const published = await writeRecord(directory, record);
    if (published !== record) await applyRecord(storage, items, published);
  }
}

async function applyRecord(
  storage: SyncStorage,
  items: Record<string, StoredValue>,
  record: SyncRecord,
) {
  try {
    await applyRecordToLocalStorage(storage, items, record);
  } catch (error) {
    throw new SyncLocalStorageError(error);
  }
}

function localRecords(
  items: Record<string, StoredValue>,
  remoteRecords: Map<string, SyncRecord>,
  now: () => number,
): Map<string, SyncRecord> {
  const ids = new Set<string>();
  for (const key of Object.keys(items)) {
    for (const prefix of [
      PRESET_STORAGE_PREFIX,
      UPDATED_PRESET_STORAGE_PREFIX,
      DELETED_PRESET_STORAGE_PREFIX,
    ]) {
      if (key.startsWith(prefix)) ids.add(key.slice(prefix.length));
    }
  }

  const records = new Map<string, SyncRecord>();
  for (const id of ids) {
    const deletedAt = validPresetTimestamp(items[deletedPresetStorageKey(id)]);
    if (deletedAt !== undefined) {
      records.set(id, {
        version: 1,
        id,
        updatedAt: deletedAt,
        deletedAt,
      });
      continue;
    }

    const storedPreset = items[presetStorageKey(id)];
    const preset = deserializePreset(storedPreset);
    if (!preset || preset.id !== id) continue;
    const storedUpdatedAt =
      storedPresetUpdatedAt(storedPreset) ??
      validPresetTimestamp(items[updatedPresetStorageKey(id)]);
    if (storedUpdatedAt === undefined && remoteRecords.has(id)) continue;
    records.set(id, {
      version: 1,
      id,
      updatedAt: storedUpdatedAt ?? now(),
      preset,
    });
  }
  return records;
}

async function readRemoteRecords(
  directory: string,
): Promise<Map<string, SyncRecord>> {
  const records = new Map<string, SyncRecord>();
  const entries = await readdir(directory, { withFileTypes: true });
  const placeholder = entries.find(
    (entry) =>
      entry.isFile() &&
      entry.name.startsWith(".") &&
      entry.name.endsWith(".json.icloud"),
  );
  if (placeholder) throw pendingDownloadError(placeholder.name);
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
    try {
      const value: unknown = JSON.parse(
        await readFile(join(directory, entry.name), "utf8"),
      );
      const record = parseSyncRecord(value);
      if (!record) throw new Error("Invalid synced prompt record");
      mergeRecord(records, record);
    } catch (error) {
      throw new Error(`Could not read iCloud prompt file: ${entry.name}`, {
        cause: error,
      });
    }
  }
  return records;
}

function mergeRecords(
  local: Map<string, SyncRecord>,
  remote: Map<string, SyncRecord>,
): Map<string, SyncRecord> {
  const records = new Map<string, SyncRecord>();
  for (const record of local.values()) mergeRecord(records, record);
  for (const record of remote.values()) mergeRecord(records, record);
  return records;
}

function mergeRecord(records: Map<string, SyncRecord>, candidate: SyncRecord) {
  const current = records.get(candidate.id);
  if (!current || compareRecords(candidate, current) > 0) {
    records.set(candidate.id, candidate);
  }
}

function compareRecords(left: SyncRecord, right: SyncRecord): number {
  if (isDeleted(left) !== isDeleted(right)) return isDeleted(left) ? 1 : -1;
  if (left.updatedAt !== right.updatedAt)
    return left.updatedAt - right.updatedAt;
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

async function applyRecordToLocalStorage(
  storage: SyncStorage,
  items: Record<string, StoredValue>,
  record: SyncRecord,
) {
  const presetKey = presetStorageKey(record.id);
  const updatedKey = updatedPresetStorageKey(record.id);
  const deletedKey = deletedPresetStorageKey(record.id);
  if (isDeleted(record)) {
    if (items[deletedKey] !== record.deletedAt) {
      await storage.setItem(deletedKey, record.deletedAt);
      items[deletedKey] = record.deletedAt;
    }
    if (presetKey in items) {
      await storage.removeItem(presetKey);
      delete items[presetKey];
    }
    if (updatedKey in items) {
      await storage.removeItem(updatedKey);
      delete items[updatedKey];
    }
    return;
  }

  const serializedPreset = serializeStoredPreset(
    record.preset,
    record.updatedAt,
  );
  if (items[presetKey] !== serializedPreset) {
    await storage.setItem(presetKey, serializedPreset);
    items[presetKey] = serializedPreset;
  }
  if (updatedKey in items) {
    await storage.removeItem(updatedKey);
    delete items[updatedKey];
  }
}

async function writeRecord(directory: string, record: SyncRecord) {
  const filename = `${encodeURIComponent(record.id)}.json`;
  const destination = join(directory, filename);
  await assertDownloaded(directory, filename);
  try {
    const current = parseSyncRecord(
      JSON.parse(await readFile(destination, "utf8")),
    );
    if (!current || current.id !== record.id) {
      throw new Error(`Invalid iCloud prompt record: ${filename}`);
    }
    if (compareRecords(current, record) >= 0) return current;
  } catch (error) {
    if (!isFileNotFoundError(error)) throw error;
  }
  const temporary = join(
    directory,
    `.${filename}.${process.pid}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(temporary, `${JSON.stringify(record, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await assertDownloaded(directory, filename);
    await rename(temporary, destination);
  } finally {
    await rm(temporary, { force: true });
  }
  return record;
}

async function assertDownloaded(directory: string, filename: string) {
  const placeholder = `.${filename}.icloud`;
  try {
    await access(join(directory, placeholder));
  } catch (error) {
    if (isFileNotFoundError(error)) return;
    throw error;
  }
  throw pendingDownloadError(placeholder);
}

function pendingDownloadError(filename: string) {
  return new Error(
    `iCloud prompt is not downloaded yet: ${filename}. Download it in iCloud Drive and try again.`,
  );
}

function parseSyncRecord(value: unknown): SyncRecord | undefined {
  if (!isRecord(value) || value.version !== 1) return undefined;
  if (typeof value.id !== "string" || !value.id.trim()) return undefined;
  const updatedAt = validPresetTimestamp(value.updatedAt);
  if (updatedAt === undefined) return undefined;

  const deletedAt = validPresetTimestamp(value.deletedAt);
  if (deletedAt !== undefined) {
    return { version: 1, id: value.id, updatedAt, deletedAt };
  }

  const preset = deserializePreset(JSON.stringify(value.preset));
  if (!preset || preset.id !== value.id) return undefined;
  return { version: 1, id: value.id, updatedAt, preset };
}

function isDeleted(record: SyncRecord): record is DeletedSyncRecord {
  return "deletedAt" in record;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFileNotFoundError(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === "ENOENT"
  );
}
