import { environment } from "@raycast/api";
import { readFile } from "node:fs/promises";
import path from "node:path";

export type HistoryEntry = {
  id: string;
  taskName: string;
  durationMinutes: number;
  startedAt: number;
  endedAt: number;
  actualWorkMs: number;
  endReason: "time-limit" | "manual";
};

export function parseHistory(contents: string): HistoryEntry[] {
  const value: unknown = JSON.parse(contents);
  if (!Array.isArray(value)) throw new Error("Invalid task history file.");
  for (const item of value) {
    const entry = item as HistoryEntry | null;
    if (
      !entry ||
      typeof entry.id !== "string" ||
      !entry.id ||
      typeof entry.taskName !== "string" ||
      !entry.taskName.trim() ||
      !Number.isSafeInteger(entry.durationMinutes) ||
      entry.durationMinutes <= 0 ||
      !Number.isSafeInteger(entry.startedAt) ||
      !Number.isSafeInteger(entry.endedAt) ||
      entry.endedAt < entry.startedAt ||
      !Number.isSafeInteger(entry.actualWorkMs) ||
      entry.actualWorkMs < 0 ||
      entry.actualWorkMs > entry.durationMinutes * 60_000 ||
      (entry.endReason !== "time-limit" && entry.endReason !== "manual")
    ) {
      throw new Error("Invalid task history record. The saved file has not been changed.");
    }
  }
  return (value as HistoryEntry[]).sort((a, b) => b.endedAt - a.endedAt);
}

export async function readHistory(): Promise<HistoryEntry[]> {
  try {
    return parseHistory(await readFile(path.join(environment.supportPath, "task-history.json"), "utf8"));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}

export function formatWorkingTime(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  return `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, "0")}s`;
}

export function endReasonLabel(entry: HistoryEntry): string {
  return entry.endReason === "time-limit" ? "Time limit reached" : "Ended manually";
}
