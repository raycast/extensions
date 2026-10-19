import { environment } from "@raycast/api";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseHistory, type HistoryEntry } from "./history-entry";

export * from "./history-entry";

export async function readHistory(): Promise<HistoryEntry[]> {
  try {
    return parseHistory(await readFile(path.join(environment.supportPath, "task-history.json"), "utf8"));
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
    throw error;
  }
}
