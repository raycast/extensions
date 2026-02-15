import { LocalStorage, environment } from "@raycast/api";
import { access, mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { atomicWriteFile } from "./atomic-write";
import { LAST_APPEND_RECORD_KEY, LAST_APPENDED_FILE_KEY } from "./constants";

interface LastAppendRecord {
  filePath: string;
  existedBefore: boolean;
  afterHash: string;
  backupPath?: string;
}

export interface UndoLastAppendResult {
  filePath: string;
  restored: "restored" | "deleted";
}

function hashBuffer(content: Buffer): string {
  return createHash("sha256").update(content).digest("hex");
}

function getUndoBackupPath(): string {
  return path.join(environment.supportPath, "undo-last-append-before.bin");
}

async function saveRecord(record: LastAppendRecord): Promise<void> {
  await LocalStorage.setItem(LAST_APPEND_RECORD_KEY, JSON.stringify(record));
  await LocalStorage.setItem(LAST_APPENDED_FILE_KEY, record.filePath);
}

async function loadRecord(): Promise<LastAppendRecord | undefined> {
  const raw = await LocalStorage.getItem<string>(LAST_APPEND_RECORD_KEY);
  if (!raw) return undefined;

  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed.filePath === "string" &&
      typeof parsed.existedBefore === "boolean" &&
      typeof parsed.afterHash === "string"
    ) {
      return parsed as LastAppendRecord;
    }
  } catch {
    // Ignore invalid record data.
  }

  return undefined;
}

async function clearRecord(): Promise<void> {
  await LocalStorage.removeItem(LAST_APPEND_RECORD_KEY);
}

export async function recordLastAppend(
  filePath: string,
  beforeRaw: Buffer | null,
  afterRaw: Buffer,
): Promise<void> {
  await mkdir(environment.supportPath, { recursive: true });

  const backupPath = getUndoBackupPath();
  if (beforeRaw) {
    await atomicWriteFile(backupPath, beforeRaw);
  } else {
    await rm(backupPath, { force: true });
  }

  await saveRecord({
    filePath,
    existedBefore: beforeRaw !== null,
    afterHash: hashBuffer(afterRaw),
    backupPath: beforeRaw ? backupPath : undefined,
  });
}

export async function getLastAppendedFile(): Promise<string | undefined> {
  const raw = await LocalStorage.getItem<string>(LAST_APPENDED_FILE_KEY);
  if (!raw) return undefined;
  return raw;
}

export async function undoLastAppend(): Promise<UndoLastAppendResult> {
  const record = await loadRecord();
  if (!record) {
    throw new Error("No append operation to undo yet.");
  }

  let currentRaw: Buffer;
  try {
    currentRaw = await readFile(record.filePath);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    if (nodeError.code === "ENOENT") {
      throw new Error(
        "The file no longer exists, so undo cannot be safely applied.",
      );
    }
    throw error;
  }

  if (hashBuffer(currentRaw) !== record.afterHash) {
    throw new Error("Undo blocked: file changed after the last append.");
  }

  if (!record.existedBefore) {
    await rm(record.filePath, { force: false });
    if (record.backupPath) {
      await rm(record.backupPath, { force: true });
    }
    await clearRecord();
    return {
      filePath: record.filePath,
      restored: "deleted",
    };
  }

  if (!record.backupPath) {
    throw new Error("Undo data is incomplete. No backup snapshot available.");
  }

  try {
    await access(record.backupPath);
  } catch {
    throw new Error("Undo data is missing. Backup snapshot not found.");
  }

  const backupRaw = await readFile(record.backupPath);
  await atomicWriteFile(record.filePath, backupRaw);
  await rm(record.backupPath, { force: true });
  await clearRecord();

  return {
    filePath: record.filePath,
    restored: "restored",
  };
}
