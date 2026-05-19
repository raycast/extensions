import { LocalStorage } from "@raycast/api";

export type HistoryKind = "translate" | "rewrite";

export interface HistoryEntry {
  id: string;
  kind: HistoryKind;
  source: string;
  output: string;
  provider?: string;
  model?: string;
  createdAt: number;
}

const STORAGE_KEY = "history-entries-v1";
const MAX_ENTRIES = 50;

// LocalStorage has no atomic read-modify-write. Serialize mutations so two
// quick copies (e.g. copying several provider results) can't clobber each
// other's writes.
let writeChain: Promise<void> = Promise.resolve();

function enqueueWrite(task: () => Promise<void>): Promise<void> {
  const next = writeChain.then(task, task);
  writeChain = next.catch(() => undefined);
  return next;
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry).slice(0, MAX_ENTRIES);
  } catch {
    return [];
  }
}

export async function addHistoryEntry(entry: Omit<HistoryEntry, "id" | "createdAt">): Promise<void> {
  const source = entry.source.trim();
  const output = entry.output.trim();
  if (!source || !output) return;

  await enqueueWrite(async () => {
    const existing = await loadHistory();
    const deduped = existing.filter((e) => !(e.kind === entry.kind && e.source === source && e.output === output));
    const next: HistoryEntry[] = [
      {
        ...entry,
        source,
        output,
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now(),
      },
      ...deduped,
    ].slice(0, MAX_ENTRIES);

    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  });
}

export async function removeHistoryEntry(id: string): Promise<HistoryEntry[]> {
  let next: HistoryEntry[] = [];
  await enqueueWrite(async () => {
    next = (await loadHistory()).filter((e) => e.id !== id);
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  });
  return next;
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    (entry.kind === "translate" || entry.kind === "rewrite") &&
    typeof entry.source === "string" &&
    typeof entry.output === "string" &&
    typeof entry.createdAt === "number"
  );
}
