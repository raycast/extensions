import { trash } from "@raycast/api";
import { existsSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { preferences } from "./handy";
import { RECORDINGS_DIR } from "./paths";
import { execute, query, sqlText } from "./sqlite";

export interface HistoryEntry {
  id: number;
  file_name: string;
  timestamp: number;
  saved: boolean;
  title: string;
  transcription_text: string;
  post_processed_text: string | null;
  post_process_prompt: string | null;
  post_process_requested: boolean;
}

type RawEntry = Omit<HistoryEntry, "saved" | "post_process_requested"> & {
  saved: number;
  post_process_requested: number;
};

const COLUMNS =
  "id, file_name, timestamp, saved, title, transcription_text, post_processed_text, post_process_prompt, post_process_requested";

function mapEntry(row: RawEntry): HistoryEntry {
  return { ...row, saved: Boolean(row.saved), post_process_requested: Boolean(row.post_process_requested) };
}

export function getHistory(limit?: number): HistoryEntry[] {
  const suffix = limit ? ` LIMIT ${Math.max(1, Math.floor(limit))}` : "";
  return query<RawEntry>(`SELECT ${COLUMNS} FROM transcription_history ORDER BY timestamp DESC${suffix}`).map(mapEntry);
}

export function getLatestEntry(): HistoryEntry | null {
  return getHistory(1)[0] ?? null;
}

export function preferredText(entry: HistoryEntry): string {
  const preferProcessed = preferences().preferPostProcessed !== false;
  return (preferProcessed ? entry.post_processed_text : null) || entry.transcription_text;
}

export function recordingPath(entry: HistoryEntry): string {
  return join(RECORDINGS_DIR, basename(entry.file_name));
}

export function recordingExists(entry: HistoryEntry): boolean {
  return Boolean(entry.file_name) && existsSync(recordingPath(entry));
}

export function recordingSize(entry: HistoryEntry): number | undefined {
  try {
    return statSync(recordingPath(entry)).size;
  } catch {
    return undefined;
  }
}

export function toggleSaved(entry: HistoryEntry): void {
  execute(`UPDATE transcription_history SET saved = ${entry.saved ? 0 : 1} WHERE id = ${Number(entry.id)}`);
}

export function renameEntry(entry: HistoryEntry, title: string): void {
  execute(`UPDATE transcription_history SET title = ${sqlText(title)} WHERE id = ${Number(entry.id)}`);
}

export async function deleteEntry(entry: HistoryEntry): Promise<void> {
  execute(`DELETE FROM transcription_history WHERE id = ${Number(entry.id)}`);
  const path = recordingPath(entry);
  if (recordingExists(entry)) await trash(path);
}

export function wordsIn(entry: HistoryEntry): number {
  const text = preferredText(entry).trim();
  return text ? text.split(/\s+/u).length : 0;
}
