import { existsSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { run } from "./exec";

/**
 * Thin wrapper around the sqlite3 binary that ships with macOS (/usr/bin/sqlite3).
 * Using the system binary keeps the hook CLI dependency-free and avoids native Node modules
 * inside Raycast.
 */
function sqliteBinary(): string {
  if (process.env.AGENT_INBOX_SQLITE) return process.env.AGENT_INBOX_SQLITE;
  for (const p of ["/usr/bin/sqlite3", "/opt/homebrew/bin/sqlite3", "/usr/local/bin/sqlite3"]) {
    if (existsSync(p)) return p;
  }
  return "sqlite3";
}

export type SqlValue = string | number | boolean | null | undefined;

/** Quote a value as an SQL literal. */
export function q(v: SqlValue): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return Number.isFinite(v) ? String(Math.trunc(v)) : "NULL";
  return "'" + String(v).split("\u0000").join("").replace(/'/g, "''") + "'";
}

export class SqliteError extends Error {}

/**
 * Run statements against the database. If the last statement is a SELECT, its rows are returned.
 * Only one statement per call may produce output.
 */
export async function exec<T = Record<string, unknown>>(dbPath: string, statements: string): Promise<T[]> {
  if (!existsSync(dirname(dbPath))) mkdirSync(dirname(dbPath), { recursive: true });
  const res = await run(sqliteBinary(), ["-json", "-bail", "-cmd", ".timeout 4000", dbPath], statements, 10000);
  if (!res.ok) throw new SqliteError(res.stderr.trim() || "sqlite3 failed");
  const out = res.stdout.trim();
  if (!out) return [];
  try {
    return JSON.parse(out) as T[];
  } catch {
    throw new SqliteError("Unexpected sqlite3 output: " + out.slice(0, 200));
  }
}
