import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

const backupFile = vi.hoisted(() => ({
  ensurePrivateDirectory: vi.fn(),
  publishBackupFile: vi.fn(),
}));

vi.mock("../../src/shared/portability/backup-file", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/shared/portability/backup-file")>();
  return {
    ...original,
    ensurePrivateDirectory: backupFile.ensurePrivateDirectory,
    publishBackupFile: backupFile.publishBackupFile,
  };
});

import type { Task } from "../../src/shared/domain/model";
import { createBackupDocument, PortabilityError } from "../../src/shared/portability/backup-contract";
import { readSnapshot } from "../../src/shared/portability/export-backup";
import { buildImportPreview, snapshotFingerprint } from "../../src/shared/portability/import-preview";
import { PortabilityService, type PreparedImport } from "../../src/shared/portability/portability-service";
import { ImportReplacementError } from "../../src/shared/portability/replace-backup";
import { openWorktodoDatabase } from "../../src/shared/storage/database";
import { applyMigrations } from "../../src/shared/storage/schema";
import { SqliteTaskRepository } from "../../src/shared/storage/sqlite-task-repository";

const temporaryDirectories: string[] = [];

const initialTask: Task = {
  id: "00000000-0000-4000-8000-000000000001",
  title: "Keep this task",
  notes: "",
  priority: false,
  position: 1_024,
  projectId: null,
  labelIds: [],
  due: { kind: "none" },
  createdAtMs: 1_000,
  updatedAtMs: 1_000,
  completedAtMs: null,
  trashedAtMs: null,
};

afterEach(async () => {
  vi.resetAllMocks();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("replacement recovery durability", () => {
  it("rolls back the exact prior database when recovery publication reports a sync failure", async () => {
    const directory = await mkdtemp(join(tmpdir(), "worktodo-durability-replacement-test-"));
    temporaryDirectories.push(directory);
    const db = openWorktodoDatabase(join(directory, "worktodo.sqlite"));
    applyMigrations(db);
    const repository = new SqliteTaskRepository(db);
    repository.transaction(() => repository.insertTask(initialTask));
    const before = readSnapshot(repository);
    const incoming = createBackupDocument(2_000, { projects: [], labels: [], tasks: [] });
    const prepared: PreparedImport = {
      path: join(directory, "incoming.json"),
      document: incoming,
      preview: buildImportPreview(incoming, before),
      currentFingerprint: snapshotFingerprint(before),
    };
    backupFile.publishBackupFile.mockImplementation(() => {
      throw new PortabilityError(
        "FILE_WRITE_FAILED",
        "Worktodo could not write the backup file.",
        Object.assign(new Error("EIO"), { code: "EIO" }),
      );
    });

    try {
      let error: unknown;
      try {
        new PortabilityService(repository, join(directory, "Backups"), () => 3_000).replace(prepared);
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(ImportReplacementError);
      expect((error as ImportReplacementError).recoveryPath).toBeUndefined();
      expect(readSnapshot(repository)).toEqual(before);
    } finally {
      db.close();
    }
  });
});
