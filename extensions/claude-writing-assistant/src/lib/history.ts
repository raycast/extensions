import { Usage } from "./claude";
import { readJson, updateJson, writeJson } from "./store";
import { newId, truncate } from "./text";

export interface HistoryEntry {
  id: string;
  createdAt: number;
  /** Command name from package.json, used for the filter and the icon. */
  command: string;
  title: string;
  input: string;
  output: string;
  model: string;
  cost: number;
}

const FILE = "history.json";
const LIMIT = 300;
const TEXT_LIMIT = 20_000;

export async function addHistory(entry: Omit<HistoryEntry, "id" | "createdAt">): Promise<void> {
  const item: HistoryEntry = {
    ...entry,
    id: newId(),
    createdAt: Date.now(),
    input: truncate(entry.input, TEXT_LIMIT),
    output: truncate(entry.output, TEXT_LIMIT),
  };
  await updateJson<HistoryEntry[]>(FILE, [], (list) => [item, ...list].slice(0, LIMIT));
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
