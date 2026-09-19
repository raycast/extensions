import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { TaskRepository } from "../../src/shared/domain/repository";
import {
  createBackupDocument,
  parseBackupJson,
  PortabilityError,
  serializeBackupDocument,
  type WorktodoBackupDocument,
  type WorktodoSnapshot,
} from "../../src/shared/portability/backup-contract";
import { backupFilename, readSnapshot } from "../../src/shared/portability/export-backup";
import { buildImportPreview, snapshotFingerprint } from "../../src/shared/portability/import-preview";
import { PortabilityService, type PreparedImport } from "../../src/shared/portability/portability-service";
import {
  ImportReplacementError,
  resolveRecoveryDirectory,
  type ReplaceableTaskRepository,
} from "../../src/shared/portability/replace-backup";
import { openWorktodoDatabase } from "../../src/shared/storage/database";
import { applyMigrations } from "../../src/shared/storage/schema";
import { SqliteTaskRepository } from "../../src/shared/storage/sqlite-task-repository";
import { TaskService } from "../../src/shared/domain/task-service";

const temporaryDirectories: string[] = [];

function id(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function snapshot(offset: number): WorktodoSnapshot {
  const projectId = id(offset + 1);
  const labelId = id(offset + 2);
  return {
    projects: [{ id: projectId, name: `Project ${offset}`, position: 1_024, createdAtMs: 100, updatedAtMs: 100 }],
    labels: [
      {
        id: labelId,
        name: `Label ${offset}`,
        position: 1_024,
        createdAtMs: 100,
        updatedAtMs: 100,
      },
    ],
    tasks: [
      {
        id: id(offset + 3),
        title: `Task ${offset}`,
        notes: "Preserved notes",
        priority: true,
        position: 1_024,
        projectId,
        labelIds: [labelId],
        due: { kind: "timed", instantMs: 10_000, timeZone: "Australia/Melbourne" },
        createdAtMs: 100,
        updatedAtMs: 300,
        completedAtMs: 200,
        trashedAtMs: 300,
      },
      {
        id: id(offset + 4),
        title: `Direct task ${offset}`,
        notes: "",
        priority: false,
        position: 1_024,
        projectId,
        labelIds: [],
        due: { kind: "allDay", date: "2028-02-29" },
        createdAtMs: 100,
        updatedAtMs: 300,
        completedAtMs: null,
        trashedAtMs: 300,
      },
      {
        id: id(offset + 5),
        title: `Completed no-project task ${offset}`,
        notes: "",
        priority: false,
        position: 1_024,
        projectId: null,
        labelIds: [],
        due: { kind: "none" },
        createdAtMs: 100,
        updatedAtMs: 200,
        completedAtMs: 200,
        trashedAtMs: null,
      },
      {
        id: id(offset + 6),
        title: `Active no-project task ${offset}`,
        notes: "",
        priority: false,
        position: 1_024,
        projectId: null,
        labelIds: [],
        due: { kind: "none" },
        createdAtMs: 100,
        updatedAtMs: 100,
        completedAtMs: null,
        trashedAtMs: null,
      },
    ],
  };
}

async function createContext(initial: WorktodoSnapshot) {
  const directory = await mkdtemp(join(tmpdir(), "worktodo-replacement-test-"));
  temporaryDirectories.push(directory);
  const db = openWorktodoDatabase(join(directory, "worktodo.sqlite"));
  applyMigrations(db);
  const repository = new SqliteTaskRepository(db);
  repository.transaction(() => {
    initial.projects.forEach((project) => repository.insertProject(project));
    initial.labels.forEach((label) => repository.insertLabel(label));
    initial.tasks.forEach((task) => repository.insertTask(task));
  });
  return { db, directory, repository, recoveryDirectory: join(directory, "Backups") };
}

function failAfter(
  repository: SqliteTaskRepository,
  method: keyof ReplaceableTaskRepository,
): ReplaceableTaskRepository {
  return new Proxy(repository as ReplaceableTaskRepository, {
    get(target, property) {
      const value = target[property as keyof ReplaceableTaskRepository];
      if (typeof value !== "function") {
        return value;
      }
      return (...args: unknown[]) => {
        const result = Reflect.apply(value, target, args);
        if (property === method) {
          throw new Error(`Injected failure after ${String(method)}`);
        }
        return result;
      };
    },
  });
}

function storedDocument(repository: TaskRepository, exportedAtMs: number): WorktodoBackupDocument {
  return createBackupDocument(exportedAtMs, readSnapshot(repository));
}

function prepared(document: WorktodoBackupDocument, current: WorktodoSnapshot): PreparedImport {
  return {
    path: "/tmp/incoming.json",
    document,
    preview: buildImportPreview(document, current),
    currentFingerprint: snapshotFingerprint(current),
  };
}

function portability(
  repository: ReplaceableTaskRepository,
  recoveryDirectory: string,
  replacementAtMs: number,
): PortabilityService {
  return new PortabilityService(repository, recoveryDirectory, () => replacementAtMs);
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Worktodo backup replacement", () => {
  it("publishes recovery before replacing every stored value exactly", async () => {
    const initial = snapshot(0);
    const incoming = createBackupDocument(8_000, snapshot(100));
    const { db, repository, recoveryDirectory } = await createContext(initial);
    try {
      const result = portability(repository, recoveryDirectory, 9_000).replace(prepared(incoming, initial));

      expect(storedDocument(repository, incoming.exportedAtMs)).toEqual(incoming);
      expect(result.replaced).toEqual({
        projects: 1,
        labels: 1,
        tasks: 4,
        lifecycle: {
          activeIncomplete: 1,
          activeCompleted: 1,
          trashedIncomplete: 1,
          trashedCompleted: 1,
        },
      });
      expect(parseBackupJson(await readFile(result.recoveryPath, "utf8"))).toEqual(
        createBackupDocument(9_000, initial),
      );
      expect((await stat(recoveryDirectory)).mode & 0o777).toBe(0o700);
      expect((await stat(result.recoveryPath)).mode & 0o777).toBe(0o600);
    } finally {
      db.close();
    }
  });

  it.each([
    "deleteAllTasks",
    "deleteAllLabels",
    "deleteAllProjects",
    "insertProject",
    "insertLabel",
    "insertTask",
    "assertIntegrity",
  ] as const)("rolls back exact prior state when %s fails", async (method) => {
    const initial = snapshot(0);
    const incoming = createBackupDocument(8_000, snapshot(100));
    const { db, repository, recoveryDirectory } = await createContext(initial);
    try {
      let error: unknown;
      try {
        portability(failAfter(repository, method), recoveryDirectory, 9_000).replace(prepared(incoming, initial));
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(ImportReplacementError);
      expect((error as ImportReplacementError).recoveryPath).toBe(join(recoveryDirectory, backupFilename(9_000)));
      expect((error as ImportReplacementError).message).toBe(
        "Worktodo could not replace its data. Worktodo data was not changed.",
      );
      expect(storedDocument(repository, 9_000)).toEqual(createBackupDocument(9_000, initial));
    } finally {
      db.close();
    }
  });

  it("does not mutate production when recovery publication fails", async () => {
    const initial = snapshot(0);
    const incoming = createBackupDocument(8_000, snapshot(100));
    const { db, repository, recoveryDirectory } = await createContext(initial);
    try {
      await mkdir(recoveryDirectory);
      const collision = join(recoveryDirectory, backupFilename(9_000));
      await writeFile(collision, "existing", "utf8");

      expect(() => portability(repository, recoveryDirectory, 9_000).replace(prepared(incoming, initial))).toThrow(
        ImportReplacementError,
      );
      expect(storedDocument(repository, 9_000)).toEqual(createBackupDocument(9_000, initial));
      await expect(readFile(collision, "utf8")).resolves.toBe("existing");
    } finally {
      db.close();
    }
  });

  it("can restore the replaced state from the recovery artifact", async () => {
    const initial = snapshot(0);
    const incoming = createBackupDocument(8_000, snapshot(100));
    const { db, directory, repository, recoveryDirectory } = await createContext(initial);
    try {
      const replacement = portability(repository, recoveryDirectory, 9_000).replace(prepared(incoming, initial));
      const recovery = parseBackupJson(await readFile(replacement.recoveryPath, "utf8"));
      const secondRecoveryDirectory = join(directory, "Restore Backups");

      portability(repository, secondRecoveryDirectory, 10_000).replace(prepared(recovery, incoming));
      expect(storedDocument(repository, recovery.exportedAtMs)).toEqual(recovery);
    } finally {
      db.close();
    }
  });

  it("resolves the owner-local recovery directory", () => {
    expect(resolveRecoveryDirectory("/Users/example")).toBe(
      "/Users/example/Library/Application Support/Worktodo/Backups",
    );
    expect(() => resolveRecoveryDirectory("relative")).toThrow("must be absolute");
  });

  it.each([
    ["task creation", (service: TaskService) => service.createTask({ title: "Created after preview" })],
    ["task content", (service: TaskService) => service.updateTask(id(6), { title: "Edited after preview" })],
    ["task lifecycle", (service: TaskService) => service.completeTask(id(6))],
    ["project content", (service: TaskService) => service.renameProject(id(1), "Renamed project")],
    ["label content", (service: TaskService) => service.renameLabel(id(2), "Renamed label")],
  ])("rejects a stale preview after %s through a second connection", async (_label, mutate) => {
    const initial = snapshot(0);
    const incoming = createBackupDocument(8_000, { projects: [], labels: [], tasks: [] });
    const { db, directory, repository, recoveryDirectory } = await createContext(initial);
    const inputPath = join(directory, "incoming.json");
    await writeFile(inputPath, serializeBackupDocument(incoming), "utf8");
    const service = portability(repository, recoveryDirectory, 9_000);
    const preview = service.prepare(inputPath);
    const secondDb = openWorktodoDatabase(join(directory, "worktodo.sqlite"));
    applyMigrations(secondDb);
    const secondRepository = new SqliteTaskRepository(secondDb);
    const secondService = new TaskService(secondRepository, { createId: () => id(999), now: () => 1_000 });

    try {
      mutate(secondService);
      const expected = createBackupDocument(9_000, readSnapshot(secondRepository));
      let error: unknown;
      try {
        service.replace(preview);
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeInstanceOf(PortabilityError);
      expect(error).toMatchObject({ code: "STALE_PREVIEW" });
      expect((error as Error).message).toBe("Worktodo changed since this preview. Preview the backup again.");
      expect(createBackupDocument(9_000, readSnapshot(repository))).toEqual(expected);
      await expect(stat(recoveryDirectory)).rejects.toMatchObject({ code: "ENOENT" });
    } finally {
      secondDb.close();
      db.close();
    }
  });

  it("allows replacement after a stale import is previewed again", async () => {
    const initial = snapshot(0);
    const incoming = createBackupDocument(8_000, { projects: [], labels: [], tasks: [] });
    const { db, directory, repository, recoveryDirectory } = await createContext(initial);
    const inputPath = join(directory, "incoming.json");
    await writeFile(inputPath, serializeBackupDocument(incoming), "utf8");
    const service = portability(repository, recoveryDirectory, 9_000);
    const stale = service.prepare(inputPath);
    repository.transaction(() => repository.updateTask({ ...repository.getTask(id(6))!, notes: "Changed" }));

    try {
      expect(() => service.replace(stale)).toThrow(PortabilityError);
      const refreshed = service.prepare(inputPath);
      expect(service.replace(refreshed).replaced.tasks).toBe(0);
      expect(repository.listTasks()).toEqual([]);
    } finally {
      db.close();
    }
  });
});
