import { chmodSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, isAbsolute, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

export const WORKTODO_BUSY_TIMEOUT_MS = 2_000;
export const WORKTODO_JOURNAL_MODE = "delete";
export const WORKTODO_SYNCHRONOUS_LEVEL = 2;

export type WorktodoPragmas = {
  journalMode: string;
  synchronous: number;
  foreignKeys: number;
  busyTimeout: number;
};

export class DatabaseOpenError extends Error {
  readonly databasePath: string;

  constructor(databasePath: string, cause: unknown) {
    super(`Unable to open the Worktodo database at ${databasePath}`, { cause });
    this.name = "DatabaseOpenError";
    this.databasePath = databasePath;
  }
}

function scalar(db: DatabaseSync, sql: string): string | number {
  const row = db.prepare(sql).get();
  const value = row ? Object.values(row)[0] : undefined;

  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error(`Expected a scalar value from ${sql}`);
  }

  return value;
}

function allowUnsupportedPermissionMode(error: unknown): boolean {
  if (!(error instanceof Error) || !("code" in error)) {
    return false;
  }

  return error.code === "ENOTSUP" || error.code === "ENOSYS";
}

function setOwnerOnlyMode(path: string, mode: number): void {
  try {
    chmodSync(path, mode);
  } catch (error) {
    if (!allowUnsupportedPermissionMode(error)) {
      throw error;
    }
  }
}

export function resolveProductionDatabasePath(homeDirectory = homedir()): string {
  if (!isAbsolute(homeDirectory)) {
    throw new Error("The Worktodo home directory must be absolute");
  }

  return join(homeDirectory, "Library", "Application Support", "Worktodo", "worktodo.sqlite");
}

export function openWorktodoDatabase(databasePath: string): DatabaseSync {
  if (!isAbsolute(databasePath)) {
    throw new DatabaseOpenError(databasePath, new Error("The database path must be absolute"));
  }

  let db: DatabaseSync | undefined;

  try {
    const directory = dirname(databasePath);
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    setOwnerOnlyMode(directory, 0o700);

    db = new DatabaseSync(databasePath, {
      allowExtension: false,
      enableDoubleQuotedStringLiterals: false,
      enableForeignKeyConstraints: true,
      timeout: WORKTODO_BUSY_TIMEOUT_MS,
    });
    setOwnerOnlyMode(databasePath, 0o600);

    const journalMode = String(scalar(db, "PRAGMA journal_mode = DELETE")).toLowerCase();
    if (journalMode !== WORKTODO_JOURNAL_MODE) {
      throw new Error(`Could not establish rollback-journal mode: ${journalMode}`);
    }

    db.exec(`
      PRAGMA synchronous = FULL;
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = ${WORKTODO_BUSY_TIMEOUT_MS};
    `);

    return db;
  } catch (error) {
    db?.close();
    throw new DatabaseOpenError(databasePath, error);
  }
}

export function openProductionDatabase(): DatabaseSync {
  return openWorktodoDatabase(resolveProductionDatabasePath());
}

export function readWorktodoPragmas(db: DatabaseSync): WorktodoPragmas {
  return {
    journalMode: String(scalar(db, "PRAGMA journal_mode")).toLowerCase(),
    synchronous: Number(scalar(db, "PRAGMA synchronous")),
    foreignKeys: Number(scalar(db, "PRAGMA foreign_keys")),
    busyTimeout: Number(scalar(db, "PRAGMA busy_timeout")),
  };
}
