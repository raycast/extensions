import { existsSync, mkdirSync } from "fs";
import { spawn } from "child_process";
import { SQLInputValue } from "node:sqlite";

export class PermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PermissionError";
  }
}

export function isPermissionError(error: unknown): error is PermissionError {
  return error instanceof Error && error.name === "PermissionError";
}

function checkAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    const error = new Error("aborted");
    error.name = "AbortError";
    throw error;
  }
}

function escapeSQLValue(value: SQLInputValue): string {
  if (value === null || value === undefined) {
    return "NULL";
  }
  if (typeof value === "string") {
    return "'" + value.replace(/'/g, "''") + "'";
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "'" + String(value).replace(/'/g, "''") + "'";
}

/**
 * Execute a read-only SQL query on a SQLite database
 */
export async function executeSQL<T = unknown>(
  databasePath: string,
  query: string,
  params?: SQLInputValue[],
  options?: { signal?: AbortSignal },
): Promise<T[]> {
  checkAborted(options?.signal);

  if (!existsSync(databasePath)) {
    throw new Error("The database does not exist");
  }

  let sqlite3: typeof import("node:sqlite");
  try {
    // Use dynamic import function to avoid parcel hoisting issues
    const dynamicImport = (module: string) => import(module);
    sqlite3 = await dynamicImport("node:sqlite");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    // If sqlite3 is not available, fallback to CLI
    if (
      error?.code === "ERR_UNKNOWN_BUILTIN_MODULE" ||
      error?.code === "ERR_MODULE_NOT_FOUND" ||
      error?.message?.includes("Cannot find module")
    ) {
      return executeSQLCLI<T>(databasePath, query, params, options);
    }
    throw error;
  }

  const db = new sqlite3.DatabaseSync(databasePath, { open: false, readOnly: true });
  const abortSignal = options?.signal;

  db.open();
  checkAborted(abortSignal);

  try {
    checkAborted(abortSignal);
    const statement = db.prepare(query);
    checkAborted(abortSignal);

    const result = statement.all(...(params || []));

    db.close();
    return result as T[];
  } catch (error) {
    try {
      db.close();
    } catch {
      // Ignore close errors
    }
    throw error;
  }
}

/**
 * Execute a write operation on a SQLite database
 */
export async function executeWrite(
  databasePath: string,
  query: string,
  params?: SQLInputValue[],
  options?: { signal?: AbortSignal },
): Promise<void> {
  checkAborted(options?.signal);

  let sqlite3: typeof import("node:sqlite");
  try {
    const dynamicImport = (module: string) => import(module);
    sqlite3 = await dynamicImport("node:sqlite");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (
      error?.code === "ERR_UNKNOWN_BUILTIN_MODULE" ||
      error?.code === "ERR_MODULE_NOT_FOUND" ||
      error?.message?.includes("Cannot find module")
    ) {
      return executeWriteCLI(databasePath, query, params, options);
    }
    throw error;
  }

  const db = new sqlite3.DatabaseSync(databasePath, { open: false, readOnly: false });
  const abortSignal = options?.signal;

  db.open();
  checkAborted(abortSignal);

  try {
    checkAborted(abortSignal);
    const statement = db.prepare(query);
    checkAborted(abortSignal);

    statement.run(...(params || []));

    db.close();
  } catch (error) {
    try {
      db.close();
    } catch {
      // Ignore close errors
    }
    throw error;
  }
}

/**
 * Execute multiple write operations in a transaction
 */
export async function executeTransaction(
  databasePath: string,
  operations: Array<{ query: string; params?: SQLInputValue[] }>,
  options?: { signal?: AbortSignal },
): Promise<void> {
  checkAborted(options?.signal);

  let sqlite3: typeof import("node:sqlite");
  try {
    const dynamicImport = (module: string) => import(module);
    sqlite3 = await dynamicImport("node:sqlite");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (
      error?.code === "ERR_UNKNOWN_BUILTIN_MODULE" ||
      error?.code === "ERR_MODULE_NOT_FOUND" ||
      error?.message?.includes("Cannot find module")
    ) {
      return executeTransactionCLI(databasePath, operations, options);
    }
    throw error;
  }

  const db = new sqlite3.DatabaseSync(databasePath, { open: false, readOnly: false });
  const abortSignal = options?.signal;

  db.open();
  checkAborted(abortSignal);

  try {
    db.exec("BEGIN TRANSACTION");
    checkAborted(abortSignal);

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      const statement = db.prepare(op.query);
      statement.run(...(op.params || []));
      checkAborted(abortSignal);
    }

    db.exec("COMMIT");
    db.close();
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // Ignore rollback errors
    }
    try {
      db.close();
    } catch {
      // Ignore close errors
    }
    throw error;
  }
}

/**
 * Initialize a database with a schema
 */
export async function initializeDatabase(
  databasePath: string,
  schema: string,
  options?: { signal?: AbortSignal },
): Promise<void> {
  checkAborted(options?.signal);

  // Ensure directory exists
  const dbDir = databasePath.substring(0, databasePath.lastIndexOf("/"));
  try {
    mkdirSync(dbDir, { recursive: true });
  } catch {
    // Directory might already exist, ignore
  }

  let sqlite3: typeof import("node:sqlite");
  try {
    const dynamicImport = (module: string) => import(module);
    sqlite3 = await dynamicImport("node:sqlite");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    if (
      error?.code === "ERR_UNKNOWN_BUILTIN_MODULE" ||
      error?.code === "ERR_MODULE_NOT_FOUND" ||
      error?.message?.includes("Cannot find module")
    ) {
      return initializeDatabaseCLI(databasePath, schema, options);
    }
    throw error;
  }

  const db = new sqlite3.DatabaseSync(databasePath, { open: false, readOnly: false });
  db.open();
  db.exec(schema);
  db.close();
}

// CLI fallback implementations

function executeSQLCLI<T>(
  databasePath: string,
  query: string,
  params?: SQLInputValue[],
  options?: { signal?: AbortSignal },
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    checkAborted(options?.signal);

    // Replace ? placeholders with escaped values
    let finalQuery = query;
    if (params && params.length > 0) {
      let paramIndex = 0;
      finalQuery = query.replace(/\?/g, () => {
        const value = params[paramIndex++];
        return escapeSQLValue(value);
      });
    }

    const spawned = spawn("sqlite3", ["--json", "--readonly", databasePath, finalQuery], {
      signal: options?.signal,
    });

    let stdout = "";
    let stderr = "";

    spawned.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    spawned.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    spawned.on("close", (code, signal) => {
      if (code !== 0 || signal !== null) {
        if (stderr.includes("authorization denied")) {
          reject(new PermissionError("You do not have permission to access the database."));
        } else {
          reject(new Error(stderr || "Unknown error"));
        }
        return;
      }

      try {
        const result = JSON.parse(stdout.trim() || "[]") as T[];
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to parse SQLite CLI output: ${error}`));
      }
    });
  });
}

function executeWriteCLI(
  databasePath: string,
  query: string,
  params?: SQLInputValue[],
  options?: { signal?: AbortSignal },
): Promise<void> {
  return new Promise((resolve, reject) => {
    checkAborted(options?.signal);

    // Replace ? placeholders with escaped values
    let finalQuery = query;
    if (params && params.length > 0) {
      let paramIndex = 0;
      finalQuery = query.replace(/\?/g, () => {
        const value = params[paramIndex++];
        return escapeSQLValue(value);
      });
    }

    const child = spawn("sqlite3", [databasePath, finalQuery], {
      signal: options?.signal,
    });

    let stderr = "";

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code, signal) => {
      if (code !== 0 || signal !== null) {
        if (stderr.includes("authorization denied")) {
          reject(new PermissionError("You do not have permission to access the database."));
        } else {
          reject(new Error(stderr || "Unknown error"));
        }
        return;
      }
      resolve();
    });
  });
}

function executeTransactionCLI(
  databasePath: string,
  operations: Array<{ query: string; params?: SQLInputValue[] }>,
  options?: { signal?: AbortSignal },
): Promise<void> {
  return new Promise((resolve, reject) => {
    checkAborted(options?.signal);

    const queries: string[] = ["BEGIN TRANSACTION;"];

    operations.forEach((op) => {
      let finalQuery = op.query;
      if (op.params && op.params.length > 0) {
        let paramIndex = 0;
        finalQuery = op.query.replace(/\?/g, () => {
          const value = op.params![paramIndex++];
          return escapeSQLValue(value);
        });
      }
      queries.push(finalQuery);
    });

    queries.push("COMMIT;");

    const child = spawn("sqlite3", [databasePath, queries.join("; ")], {
      signal: options?.signal,
    });

    let stderr = "";

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code, signal) => {
      if (code !== 0 || signal !== null) {
        if (stderr.includes("authorization denied")) {
          reject(new PermissionError("You do not have permission to access the database."));
        } else {
          reject(new Error(stderr || "Unknown error"));
        }
        return;
      }
      resolve();
    });
  });
}

function initializeDatabaseCLI(
  databasePath: string,
  schema: string,
  options?: { signal?: AbortSignal },
): Promise<void> {
  return new Promise((resolve, reject) => {
    checkAborted(options?.signal);

    const child = spawn("sqlite3", [databasePath, schema], {
      signal: options?.signal,
    });

    let stderr = "";

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code, signal) => {
      if (code !== 0 || signal !== null) {
        if (stderr.includes("authorization denied")) {
          reject(new PermissionError("You do not have permission to access the database."));
        } else {
          reject(new Error(stderr || "Unknown error"));
        }
        return;
      }
      resolve();
    });
  });
}
