import { Cache } from "@raycast/api";
import { execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";
import { MetricLine, ProviderResult } from "./types";

const SELECTED_PROVIDER_KEY = "menu-bar-selected-provider";
const PROVIDER_ORDER_KEY = "provider-order";
const sharedCache = new Cache();

export function getSelectedMenuBarProvider(): string | undefined {
  return sharedCache.get(SELECTED_PROVIDER_KEY) || undefined;
}

export function setSelectedMenuBarProvider(providerId: string): void {
  sharedCache.set(SELECTED_PROVIDER_KEY, providerId);
}

export function getProviderOrder(): string[] | undefined {
  const raw = sharedCache.get(PROVIDER_ORDER_KEY);
  if (!raw) return undefined;
  try {
    const arr = JSON.parse(raw) as unknown;
    return Array.isArray(arr) && arr.every((x) => typeof x === "string") ? (arr as string[]) : undefined;
  } catch {
    return undefined;
  }
}

export function setProviderOrder(providerIds: string[]): void {
  sharedCache.set(PROVIDER_ORDER_KEY, JSON.stringify(providerIds));
}

export function reorderProviders(data: ProviderResult[] | undefined, order: string[] | undefined): ProviderResult[] {
  if (!data?.length) return data ?? [];
  if (!order?.length) return data;
  const byId = new Map(data.map((r) => [r.id, r]));
  const ordered: ProviderResult[] = [];
  for (const id of order) {
    const r = byId.get(id);
    if (r) ordered.push(r);
  }
  for (const r of data) {
    if (!order.includes(r.id)) ordered.push(r);
  }
  return ordered;
}

export function expandPath(path: string): string {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }
  return path;
}

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

export function formatResetTimeFromISO(isoString: string): string | undefined {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return undefined;
  return formatResetTime(date);
}

export function formatResetTimeFromUnixSeconds(seconds: number): string | undefined {
  return formatResetTime(new Date(seconds * 1000));
}

export function formatResetTimeFromUnixMilliseconds(ms: number): string | undefined {
  return formatResetTime(new Date(ms));
}

export function formatResetTimeFromUnixMillisecondsString(msString: string): string | undefined {
  const ms = parseInt(msString, 10);
  if (isNaN(ms)) return undefined;
  return formatResetTimeFromUnixMilliseconds(ms);
}

export function formatProgressBar(percentage: number, length = 10): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clamped / 100) * length);
  const empty = length - filled;
  return "■".repeat(filled) + "□".repeat(empty);
}

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

/** Format a timestamp (ms) as relative time for "last updated" display. */
export function formatLastUpdatedAt(ms: number): string {
  const elapsed = Date.now() - ms;
  if (elapsed < 60 * 1000) return "just now";
  if (elapsed < 60 * 60 * 1000) return `${Math.floor(elapsed / 60000)}m ago`;
  if (elapsed < 24 * 60 * 60 * 1000) return `${Math.floor(elapsed / 3600000)}h ago`;
  if (elapsed < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(elapsed / 86400000)}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Prefer a percent-unit progress line; otherwise first progress line with max > 0. */
export function getPrimaryPercentage(lines: MetricLine[]): number | undefined {
  let fallback: number | undefined;
  for (const line of lines) {
    if (line.type !== "progress" || line.max <= 0) continue;
    const pct = Math.min(100, Math.max(0, (line.value / line.max) * 100));
    if (line.unit === "percent") return pct;
    if (fallback === undefined) fallback = pct;
  }
  return fallback;
}
