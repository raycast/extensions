import { mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { TaskService } from "../../src/shared/domain/task-service";
import { assertBackupSize, publishBackupFile } from "../../src/shared/portability/backup-file";
import { parseBackupJson, PortabilityError } from "../../src/shared/portability/backup-contract";
import { backupFilename } from "../../src/shared/portability/export-backup";
import { PortabilityService } from "../../src/shared/portability/portability-service";
import { openWorktodoDatabase } from "../../src/shared/storage/database";
import { applyMigrations } from "../../src/shared/storage/schema";
import { SqliteTaskRepository } from "../../src/shared/storage/sqlite-task-repository";

const temporaryDirectories: string[] = [];

function id(index: number): string {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

async function createContext(now = Date.parse("2026-08-30T06:25:30.123Z")) {
  const directory = await mkdtemp(join(tmpdir(), "worktodo-export-test-"));
  temporaryDirectories.push(directory);
  const db = openWorktodoDatabase(join(directory, "worktodo.sqlite"));
  applyMigrations(db);
  const repository = new SqliteTaskRepository(db);
  let nextId = 1;
  const service = new TaskService(repository, { createId: () => id(nextId++), now: () => 1_000 });
  const project = service.createProject("Work");
  const label = service.createLabel("Next");
  service.createTask({
    title: "Ship backup",
    notes: "Keep every field",
    priority: true,
    projectId: project.id,
    labelIds: [label.id],
    due: { kind: "allDay", date: "2026-08-31" },
  });
  return { db, directory, portability: new PortabilityService(repository, join(directory, "recovery"), () => now) };
}

function expectCode(operation: () => unknown, code: PortabilityError["code"]): void {
  try {
    operation();
    throw new Error("Expected a portability error");
  } catch (error) {
    expect(error).toBeInstanceOf(PortabilityError);
    expect((error as PortabilityError).code).toBe(code);
  }
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("Worktodo backup export", () => {
  it("publishes a complete parseable snapshot with owner-only permissions", async () => {
    const { db, directory, portability } = await createContext();
    try {
      const output = join(directory, "exports");
      await mkdir(output);
      const result = portability.exportTo(output);
      const serialized = await readFile(result.path, "utf8");

      expect(result.path).toBe(join(output, "worktodo-backup-20260830T062530123Z.json"));
      expect(parseBackupJson(serialized)).toEqual(result.document);
      expect(result.document).toMatchObject({ projects: [{ name: "Work" }], labels: [{ name: "Next" }] });
      expect(result.document.tasks).toHaveLength(1);
      expect(result.document.tasks[0].labelIds).toEqual([result.document.labels[0].id]);
      expect((await stat(result.path)).mode & 0o777).toBe(0o600);
      expect((await readdir(output)).filter((name) => name.startsWith("."))).toEqual([]);
    } finally {
      db.close();
    }
  });

  it("never replaces an existing destination and cleans its candidate", async () => {
    const timestamp = 1_000;
    const { db, directory, portability } = await createContext(timestamp);
    try {
      const destination = join(directory, backupFilename(timestamp));
      await writeFile(destination, "existing", "utf8");

      expectCode(() => portability.exportTo(directory), "DESTINATION_EXISTS");
      await expect(readFile(destination, "utf8")).resolves.toBe("existing");
      expect((await readdir(directory)).filter((name) => name.startsWith(".worktodo-backup"))).toEqual([]);
    } finally {
      db.close();
    }
  });

  it("rejects invalid destinations without publishing a file", async () => {
    const { db, directory, portability } = await createContext(1_000);
    try {
      expectCode(() => portability.exportTo(join(directory, "missing")), "INVALID_DESTINATION");
      expectCode(() => publishBackupFile("relative", "backup.json", "{}\n"), "INVALID_DESTINATION");
    } finally {
      db.close();
    }
  });

  it("enforces a byte limit before publication", () => {
    expect(() => assertBackupSize("éé", 4)).not.toThrow();
    expectCode(() => assertBackupSize("ééx", 4), "FILE_TOO_LARGE");
  });
});
