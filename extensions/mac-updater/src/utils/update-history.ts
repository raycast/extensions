import * as fs from "fs";
import * as path from "path";
import { environment } from "@raycast/api";
import { Source } from "./types";

const HISTORY_FILE = "update-history-v1.json";
const MAX_ENTRIES = 500;

export interface HistoryEntry {
  /** When the update completed (epoch ms). */
  at: number;
  /** Display name of the app or package. */
  name: string;
  /** Optional bundle ID (apps only). */
  bundleId?: string;
  /** Where the update came from. */
  source: Source;
  /** Version strings, when known. */
  fromVersion?: string;
  toVersion?: string;
  /** What triggered the update. */
  trigger: "manual" | "bulk" | "auto";
}

function historyPath(): string {
  return path.join(environment.supportPath, HISTORY_FILE);
}

function readSync(): HistoryEntry[] {
  try {
    const p = historyPath();
    if (!fs.existsSync(p)) return [];
    return JSON.parse(fs.readFileSync(p, "utf8")) as HistoryEntry[];
  } catch {
    return [];
  }
}

function writeSync(entries: HistoryEntry[]): void {
  try {
    fs.mkdirSync(environment.supportPath, { recursive: true });
    fs.writeFileSync(historyPath(), JSON.stringify(entries));
  } catch {
    // best-effort
  }
}

export function recordHistory(entry: Omit<HistoryEntry, "at">): void {
  const entries = readSync();
  entries.unshift({ ...entry, at: Date.now() });
  // Cap to avoid the file growing forever
  writeSync(entries.slice(0, MAX_ENTRIES));
}

export function getHistory(limit?: number): HistoryEntry[] {
  const entries = readSync();
  return limit ? entries.slice(0, limit) : entries;
}

export function clearHistory(): void {
  try {
    fs.unlinkSync(historyPath());
  } catch {
    // ignore
  }
}
