import { trash } from "@raycast/api";
import { execFileSync } from "child_process";
import { existsSync } from "fs";
import { join } from "path";
import { DB_PATH, RECORDINGS_DIR } from "./constants";

export interface HistoryEntry {
  id: number;
  file_name: string;
  timestamp: number;
  saved: boolean;
  title: string;
  transcription_text: string;
  post_processed_text: string | null;
  post_process_prompt: string | null;
}

const SQLITE3 = "/usr/bin/sqlite3";
const SELECT_COLS =
  "id, file_name, timestamp, saved, title, transcription_text, post_processed_text, post_process_prompt";

function queryDb<T extends Record<string, unknown>>(
  dbPath: string,
  sql: string,
): T[] {
  const out = execFileSync(SQLITE3, ["-json", dbPath, sql], {
    encoding: "utf-8",
  });
  return JSON.parse(out.trim() || "[]") as T[];
}

function execDb(dbPath: string, sql: string): void {
  execFileSync(SQLITE3, [dbPath, sql]);
}

function mapRow(row: Record<string, unknown>): HistoryEntry {
  return {
    id: row.id as number,
    file_name: row.file_name as string,
    timestamp: row.timestamp as number,
    saved: Boolean(row.saved),
    title: row.title as string,
    transcription_text: row.transcription_text as string,
    post_processed_text: (row.post_processed_text as string | null) ?? null,
    post_process_prompt: (row.post_process_prompt as string | null) ?? null,
  };
}

export function getHistory(dbPath = DB_PATH): HistoryEntry[] {
  return queryDb<Record<string, unknown>>(
    dbPath,
    `SELECT ${SELECT_COLS} FROM transcription_history ORDER BY timestamp DESC`,
  ).map(mapRow);
}

export function getLatestEntry(dbPath = DB_PATH): HistoryEntry | null {
  const rows = queryDb<Record<string, unknown>>(
    dbPath,
    `SELECT ${SELECT_COLS} FROM transcription_history ORDER BY timestamp DESC LIMIT 1`,
  );
  return rows.length > 0 ? mapRow(rows[0]) : null;
}

export function toggleSaved(id: number, dbPath = DB_PATH): void {
  const rows = queryDb<{ saved: number }>(
    dbPath,
    `SELECT saved FROM transcription_history WHERE id = ${Number(id)}`,
  );
  if (rows.length === 0) return;
  const newVal = rows[0].saved ? 0 : 1;
  execDb(
    dbPath,
    `UPDATE transcription_history SET saved = ${newVal} WHERE id = ${Number(id)}`,
  );
}

export async function deleteEntry(
  id: number,
  dbPath = DB_PATH,
  recordingsDir = RECORDINGS_DIR,
): Promise<void> {
  const rows = queryDb<{ file_name: string }>(
    dbPath,
    `SELECT file_name FROM transcription_history WHERE id = ${Number(id)}`,
  );
  if (rows.length > 0) {
    const wav = join(recordingsDir, rows[0].file_name);
    if (existsSync(wav)) await trash(wav);
  }
  execDb(dbPath, `DELETE FROM transcription_history WHERE id = ${Number(id)}`);
}

export function displayText(entry: HistoryEntry): string {
  return entry.post_processed_text ?? entry.transcription_text;
}
