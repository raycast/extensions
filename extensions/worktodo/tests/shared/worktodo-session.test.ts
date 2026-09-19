import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openWorktodoAtPath } from "../../src/shared/application/worktodo";
import { parseBackupJson } from "../../src/shared/portability/backup-contract";
import { openWorktodoDatabase } from "../../src/shared/storage/database";
import { applyMigrations, type MigrationResult } from "../../src/shared/storage/schema";

const temporaryDirectories: string[] = [];

function id(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

afterEach(async () => {
  vi.restoreAllMocks();
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Worktodo application session", () => {
  it("composes persistence and portability at explicit disposable paths", async () => {
    const directory = await mkdtemp(join(tmpdir(), "worktodo-session-test-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "store", "worktodo.sqlite");
    const recoveryDirectory = join(directory, "recovery");
    const exportDirectory = join(directory, "exports");
    await mkdir(exportDirectory);
    let nextId = 1;
    const migrations: MigrationResult[] = [];
    const migrate = (database: Parameters<typeof applyMigrations>[0]) => {
      const result = applyMigrations(database);
      migrations.push(result);
      return result;
    };

    const first = openWorktodoAtPath(databasePath, {
      createId: () => id(nextId++),
      migrate,
      now: () => 1_000,
      recoveryDirectory,
    });
    const project = first.service.createProject("Work");
    const label = first.service.createLabel("Next");
    const task = first.service.createTask({
      title: "Protect application wiring",
      projectId: project.id,
      labelIds: [label.id],
    });
    const exported = first.portability.exportTo(exportDirectory);
    first.close();

    expect(parseBackupJson(await readFile(exported.path, "utf8")).tasks).toEqual([task]);
    expect(exported.path.startsWith(`${exportDirectory}/`)).toBe(true);

    const reopened = openWorktodoAtPath(databasePath, {
      createId: () => id(nextId++),
      migrate,
      now: () => 2_000,
      recoveryDirectory,
    });
    try {
      expect(reopened.databasePath).toBe(databasePath);
      expect(reopened.service.getTask(task.id)).toEqual(task);
    } finally {
      reopened.close();
    }

    const inspection = openWorktodoDatabase(databasePath);
    try {
      expect(inspection.prepare("PRAGMA user_version").get()?.user_version).toBe(3);
      expect(migrations).toEqual([
        { applied: true, previousVersion: 0, currentVersion: 3 },
        { applied: false, previousVersion: 3, currentVersion: 3 },
      ]);
    } finally {
      inspection.close();
    }
  });

  it("closes the opened database when session construction fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "worktodo-session-failure-test-"));
    temporaryDirectories.push(directory);
    const databasePath = join(directory, "worktodo.sqlite");
    const database = openWorktodoDatabase(databasePath);
    const close = vi.spyOn(database, "close");

    expect(() =>
      openWorktodoAtPath(databasePath, {
        migrate: () => {
          throw new Error("injected migration failure");
        },
        openDatabase: () => database,
        recoveryDirectory: join(directory, "recovery"),
      }),
    ).toThrow("injected migration failure");
    expect(close).toHaveBeenCalledOnce();
  });
});
