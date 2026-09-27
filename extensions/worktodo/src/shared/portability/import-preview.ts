import { createHash } from "node:crypto";
import { readFileSync, statSync, type BigIntStats } from "node:fs";
import { extname, isAbsolute } from "node:path";
import {
  createBackupDocument,
  parseBackupJson,
  PortabilityError,
  serializeBackupDocument,
  type WorktodoBackupDocument,
  type WorktodoSnapshot,
} from "./backup-contract";
import { WORKTODO_MAX_BACKUP_BYTES } from "./backup-file";

export type TaskLifecycleCounts = {
  activeIncomplete: number;
  activeCompleted: number;
  trashedIncomplete: number;
  trashedCompleted: number;
};

export type BackupCounts = {
  projects: number;
  labels: number;
  tasks: number;
  lifecycle: TaskLifecycleCounts;
};

export type ImportPreview = {
  formatVersion: number;
  exportedAtMs: number;
  incoming: BackupCounts;
  current: BackupCounts;
  confirmationTitle: "Replace Worktodo data";
  warning: string;
};

export type PreparedImport = {
  path: string;
  document: WorktodoBackupDocument;
  preview: ImportPreview;
  currentFingerprint: string;
};

export function snapshotFingerprint(snapshot: WorktodoSnapshot): string {
  const canonical = serializeBackupDocument(
    createBackupDocument(0, {
      projects: snapshot.projects,
      labels: snapshot.labels,
      tasks: snapshot.tasks,
    }),
  );
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function sameFile(left: BigIntStats, right: BigIntStats): boolean {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeNs === right.mtimeNs &&
    left.ctimeNs === right.ctimeNs
  );
}

function importFileError(error: unknown): PortabilityError {
  return error instanceof PortabilityError
    ? error
    : new PortabilityError("INVALID_IMPORT_FILE", "Choose one existing Worktodo JSON backup file.", error);
}

export function readBackupFile(path: string, maximumBytes = WORKTODO_MAX_BACKUP_BYTES): WorktodoBackupDocument {
  if (!isAbsolute(path) || extname(path).toLowerCase() !== ".json") {
    throw new PortabilityError("INVALID_IMPORT_FILE", "Choose one existing Worktodo JSON backup file.");
  }

  let before: BigIntStats;
  let contents: Buffer;
  let after: BigIntStats;
  try {
    before = statSync(path, { bigint: true });
    if (!before.isFile()) {
      throw new PortabilityError("INVALID_IMPORT_FILE", "Choose one existing Worktodo JSON backup file.");
    }
    if (before.size > BigInt(maximumBytes)) {
      throw new PortabilityError("FILE_TOO_LARGE", "The Worktodo backup exceeds the 100 MiB limit.");
    }
    contents = readFileSync(path);
    after = statSync(path, { bigint: true });
  } catch (error) {
    throw importFileError(error);
  }

  if (!sameFile(before, after)) {
    throw new PortabilityError("FILE_CHANGED", "The selected backup changed while Worktodo was reading it.");
  }
  if (contents.byteLength > maximumBytes) {
    throw new PortabilityError("FILE_TOO_LARGE", "The Worktodo backup exceeds the 100 MiB limit.");
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(contents);
  } catch (error) {
    throw new PortabilityError("INVALID_DOCUMENT", "This file is not valid UTF-8 JSON.", error);
  }
  return parseBackupJson(text);
}

export function countSnapshot(snapshot: WorktodoSnapshot): BackupCounts {
  const lifecycle: TaskLifecycleCounts = {
    activeIncomplete: 0,
    activeCompleted: 0,
    trashedIncomplete: 0,
    trashedCompleted: 0,
  };

  for (const task of snapshot.tasks) {
    if (task.trashedAtMs === null) {
      if (task.completedAtMs === null) {
        lifecycle.activeIncomplete += 1;
      } else {
        lifecycle.activeCompleted += 1;
      }
    } else if (task.completedAtMs === null) {
      lifecycle.trashedIncomplete += 1;
    } else {
      lifecycle.trashedCompleted += 1;
    }
  }

  return {
    projects: snapshot.projects.length,
    labels: snapshot.labels.length,
    tasks: snapshot.tasks.length,
    lifecycle,
  };
}

export function buildImportPreview(incoming: WorktodoBackupDocument, current: WorktodoSnapshot): ImportPreview {
  return {
    formatVersion: incoming.version,
    exportedAtMs: incoming.exportedAtMs,
    incoming: countSnapshot(incoming),
    current: countSnapshot(current),
    confirmationTitle: "Replace Worktodo data",
    warning: "This will replace all current Worktodo data. Cancelling changes nothing.",
  };
}
