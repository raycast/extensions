import { Usage } from "./claude";
import { readJson, updateJson, writeJson } from "./store";
import { HistoryEntry, trimHistory } from "./history-entry";
import { newId } from "./text";

export type { HistoryEntry };

const FILE = "history.json";

export async function addHistory(entry: Omit<HistoryEntry, "id" | "createdAt">): Promise<void> {
  const item: HistoryEntry = { ...entry, id: newId(), createdAt: Date.now() };
  await updateJson<HistoryEntry[]>(FILE, [], (list) => trimHistory([item, ...list]));
}

export function historyFromUsage(
  command: string,
  title: string,
  input: string,
  output: string,
  usage: Usage,
): Omit<HistoryEntry, "id" | "createdAt"> {
  return { command, title, input, output, model: usage.model, cost: usage.cost };
}

export function loadHistory(): Promise<HistoryEntry[]> {
  return readJson<HistoryEntry[]>(FILE, []);
}

export async function removeHistory(id: string): Promise<void> {
  await updateJson<HistoryEntry[]>(FILE, [], (list) => list.filter((entry) => entry.id !== id));
}

export async function clearHistory(): Promise<void> {
  await writeJson(FILE, []);
}
