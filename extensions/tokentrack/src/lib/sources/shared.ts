import { execFile, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function expandHome(path: string) {
  if (!path) return path;
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return join(homedir(), path.slice(2));
  return path;
}

export function isInRange(timestamp: Date, start: Date, end: Date) {
  const time = timestamp.getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function estimateTokensFromText(value: unknown) {
  if (typeof value !== "string" || value.length === 0) return 0;
  return Math.ceil(value.length / 4);
}

export async function runSqlite(databasePath: string, query: string) {
  if (!existsSync(databasePath)) return "";
  const { stdout } = await execFileAsync(
    "sqlite3",
    ["-json", databasePath, query],
    {
      maxBuffer: 1024 * 1024 * 5,
    },
  );
  return stdout;
}

export function runSqliteSync(databasePath: string, query: string) {
  if (!existsSync(databasePath)) return "";
  return execFileSync("sqlite3", ["-json", databasePath, query], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 5,
  });
}

export async function runSqliteUri(databasePath: string, query: string) {
  if (!existsSync(databasePath)) return "";
  const uri = `file:${databasePath.replace(/ /g, "%20")}?mode=ro&immutable=1`;
  const { stdout } = await execFileAsync("sqlite3", ["-json", uri, query], {
    maxBuffer: 1024 * 1024 * 5,
  });
  return stdout;
}

export function runSqliteUriSync(databasePath: string, query: string) {
  if (!existsSync(databasePath)) return "";
  const uri = `file:${databasePath.replace(/ /g, "%20")}?mode=ro&immutable=1`;
  return execFileSync("sqlite3", ["-json", uri, query], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 5,
  });
}

export function parseJsonRows<T>(stdout: string): T[] {
  if (!stdout.trim()) return [];
  return JSON.parse(stdout) as T[];
}
