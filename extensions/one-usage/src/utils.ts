import { execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { MetricLine } from "./types";

/**
 * Expand ~ to the user's home directory.
 */
export function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

/**
 * Read a single string value from a SQLite key-value table using the sqlite3 CLI.
 * Matches the Swift SQLiteHelper.readValue behavior.
 */
export function readSqliteValue(
  dbPath: string,
  key: string,
  table = "ItemTable",
  keyColumn = "key",
  valueColumn = "value",
): string {
  const escapedKey = key.replace(/'/g, "''");
  const query = `SELECT ${valueColumn} FROM ${table} WHERE ${keyColumn}='${escapedKey}'`;
  try {
    const result = execSync(`/usr/bin/sqlite3 "${dbPath}" "${query}"`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    if (!result) {
      throw new Error(`SQLite read failed or empty for key: ${key}`);
    }
    return result;
  } catch (e) {
    throw new Error(`SQLite read failed for key: ${key}: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Read a password from the macOS Keychain using the `security` CLI.
 * Returns null if not found or access denied.
 */
export function readKeychainPassword(service: string): string | null {
  try {
    const result = execSync(`/usr/bin/security find-generic-password -s "${service}" -w 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    return result || null;
  } catch {
    return null;
  }
}

/**
 * Check if a JWT token is expired (with a 5-minute buffer).
 * Matches the Swift isTokenExpired behavior.
 */
export function isJwtExpired(jwt: string, bufferSeconds = 300): boolean {
  const parts = jwt.split(".");
  if (parts.length < 2) return true;

  let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  while (payload.length % 4 !== 0) payload += "=";

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
    if (typeof decoded.exp !== "number") return true;
    return Date.now() / 1000 > decoded.exp - bufferSeconds;
  } catch {
    return true;
  }
}

/**
 * Format a Date to a human-readable "Resets in X" string.
 * Matches the Swift ResetTimeFormatter.format behavior.
 */
export function formatResetTime(date: Date): string {
  const secondsRemaining = (date.getTime() - Date.now()) / 1000;
  if (secondsRemaining <= 0) return "Resets soon";

  const totalSeconds = Math.floor(secondsRemaining);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (days > 0) return `Resets in ${days}d ${hours}h`;
  if (hours > 0) return `Resets in ${hours}h ${minutes}m`;
  if (minutes > 0) return `Resets in ${minutes}m`;
  return "Resets in <1m";
}

/** Format an ISO 8601 date string to "Resets in X" */
export function formatResetTimeFromISO(isoString: string): string | undefined {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return undefined;
  return formatResetTime(date);
}

/** Format a Unix timestamp (seconds) to "Resets in X" */
export function formatResetTimeFromUnixSeconds(seconds: number): string | undefined {
  return formatResetTime(new Date(seconds * 1000));
}

/** Format a Unix timestamp (milliseconds) to "Resets in X" */
export function formatResetTimeFromUnixMilliseconds(ms: number): string | undefined {
  return formatResetTime(new Date(ms));
}

/** Format a Unix timestamp string (milliseconds) to "Resets in X" */
export function formatResetTimeFromUnixMillisecondsString(msString: string): string | undefined {
  const ms = parseInt(msString, 10);
  if (isNaN(ms)) return undefined;
  return formatResetTimeFromUnixMilliseconds(ms);
}

/**
 * Generate a visual progress bar string using ■/□ characters.
 * Example: "■■■■■■□□□□ 60%"
 */
export function formatProgressBar(percentage: number, length = 10): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clamped / 100) * length);
  const empty = length - filled;
  return "■".repeat(filled) + "□".repeat(empty);
}

/**
 * Format a progress value for display.
 * Matches the Swift MetricLine.formatProgressValue behavior.
 */
export function formatProgressValue(value: number, max: number, unit?: "percent" | "dollars"): string {
  switch (unit) {
    case "percent":
      return `${Math.round(value)}%`;
    case "dollars":
      return `$${value.toFixed(2)}`;
    default:
      return value.toFixed(1);
  }
}

/**
 * Get the primary percentage (0–100) from a list of MetricLines.
 * Matches the Swift ProviderOutput.primaryPercentage behavior.
 */
export function getPrimaryPercentage(lines: MetricLine[]): number | undefined {
  // Prefer the first percent-unit progress line
  for (const line of lines) {
    if (line.type === "progress" && line.unit === "percent" && line.max > 0) {
      return Math.min(100, Math.max(0, (line.value / line.max) * 100));
    }
  }
  // Fall back to any progress line
  for (const line of lines) {
    if (line.type === "progress" && line.max > 0) {
      return Math.min(100, Math.max(0, (line.value / line.max) * 100));
    }
  }
  return undefined;
}
