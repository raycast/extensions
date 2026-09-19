import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  DatabaseOpenError,
  openWorktodoDatabase,
  readWorktodoPragmas,
  resolveProductionDatabasePath,
  WORKTODO_BUSY_TIMEOUT_MS,
} from "../../src/shared/storage/database";

const temporaryDirectories: string[] = [];

async function temporaryPath(): Promise<{ databasePath: string; directory: string }> {
  const directory = await mkdtemp(join(tmpdir(), "worktodo-production-database-test-"));
  temporaryDirectories.push(directory);
  return { databasePath: join(directory, "nested", "worktodo.sqlite"), directory };
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

describe("production database", () => {
  it("resolves one canonical Application Support path", () => {
    expect(resolveProductionDatabasePath("/Users/example")).toBe(
      "/Users/example/Library/Application Support/Worktodo/worktodo.sqlite",
    );
    expect(() => resolveProductionDatabasePath("relative-home")).toThrow("must be absolute");
  });

  it("creates an owner-only store with the required connection policy", async () => {
    const { databasePath } = await temporaryPath();
    const db = openWorktodoDatabase(databasePath);
    try {
      expect(readWorktodoPragmas(db)).toEqual({
        journalMode: "delete",
        synchronous: 2,
        foreignKeys: 1,
        busyTimeout: WORKTODO_BUSY_TIMEOUT_MS,
      });
      expect(() => db.prepare('SELECT "double-quoted literal"').get()).toThrow();
      expect(() => db.loadExtension("unreviewed-extension")).toThrow();
      expect((await stat(dirname(databasePath))).mode & 0o777).toBe(0o700);
      expect((await stat(databasePath)).mode & 0o777).toBe(0o600);
    } finally {
      db.close();
    }
  });

  it("reopens the same injected path without losing data", async () => {
    const { databasePath } = await temporaryPath();
    const first = openWorktodoDatabase(databasePath);
    first.exec("CREATE TABLE retained (value TEXT NOT NULL) STRICT; INSERT INTO retained VALUES ('same store');");
    first.close();

    const second = openWorktodoDatabase(databasePath);
    try {
      expect(second.prepare("SELECT value FROM retained").get()?.value).toBe("same store");
    } finally {
      second.close();
    }
  });

  it("surfaces an inaccessible path without creating a fallback database", async () => {
    const { directory } = await temporaryPath();
    const blocker = join(directory, "not-a-directory");
    await writeFile(blocker, "blocked", "utf8");
    const databasePath = join(blocker, "worktodo.sqlite");

    expect(() => openWorktodoDatabase(databasePath)).toThrow(DatabaseOpenError);
    await expect(readFile(blocker, "utf8")).resolves.toBe("blocked");
    await expect(stat(databasePath)).rejects.toMatchObject({ code: "ENOTDIR" });
  });

  it("requires an absolute injected path", async () => {
    const { directory } = await temporaryPath();
    await mkdir(join(directory, "unused"));
    expect(() => openWorktodoDatabase("worktodo.sqlite")).toThrow(DatabaseOpenError);
  });
});
