import { access } from "node:fs/promises";
import path from "node:path";
import type { BrowserEntry, Profile } from "../types";
import { queryReadonly } from "./sqlite";

const CHROME_EPOCH = 11644473600000;

export function parseHistoryLimit(value?: string) {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0
    ? Math.min(parsed, 100000)
    : 1000;
}

export function parseHistoryDays(value?: string | number) {
  if (value === undefined || value === "") return 14;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed >= 0
    ? Math.min(parsed, 36500)
    : 14;
}

export function chromeTimeToUnix(value: number) {
  return Math.floor(value / 1000 - CHROME_EPOCH);
}

export async function readHistory(
  profile: Profile,
  limit: number,
  days = 14,
): Promise<BrowserEntry[]> {
  const database = path.join(profile.path, "History");
  try {
    await access(database);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const safeLimit = parseHistoryLimit(String(limit));
  const safeDays = parseHistoryDays(days);
  const now = Date.now();
  const cutoff = safeDays
    ? ` AND last_visit_time >= ${Math.floor((now - safeDays * 86400000 + CHROME_EPOCH) * 1000)}`
    : "";
  // 先只读查询，锁冲突时由 queryReadonly 读取私有稳定快照；源数据库不改写。
  const endTime = Math.floor((now + CHROME_EPOCH) * 1000);
  const query = `SELECT id, url, title, last_visit_time FROM urls WHERE last_visit_time > 0 AND last_visit_time <= ${endTime}${cutoff} ORDER BY last_visit_time DESC LIMIT ${safeLimit};`;
  const stdout = await queryReadonly(database, query);
  const rows = JSON.parse(stdout || "[]") as {
    id: number;
    url: string;
    title: string;
    last_visit_time: number;
  }[];
  return rows
    .filter(
      (row) =>
        typeof row.url === "string" &&
        row.url &&
        !row.url.startsWith("chrome-extension:"),
    )
    .map((row) => ({
      id: `history:${profile.id}:${row.id}`,
      source: "history",
      title: row.title || "",
      url: row.url,
      visitedAt: chromeTimeToUnix(row.last_visit_time),
      profile,
    }));
}
