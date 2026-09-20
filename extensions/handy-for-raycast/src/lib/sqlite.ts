import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { DB_PATH } from "./paths";

const SQLITE = "/usr/bin/sqlite3";

function ensureDatabase(path: string) {
  if (!existsSync(path)) throw new Error("No Handy history found. Record something in Handy first.");
}

export function query<T>(sql: string, path = DB_PATH): T[] {
  ensureDatabase(path);
  const output = execFileSync(SQLITE, ["-readonly", "-json", path, sql], { encoding: "utf8", timeout: 10_000 });
  return JSON.parse(output.trim() || "[]") as T[];
}

export function execute(sql: string, path = DB_PATH): void {
  ensureDatabase(path);
  execFileSync(SQLITE, [path, ".timeout 5000", sql], { encoding: "utf8", timeout: 10_000 });
}

export function sqlText(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}
