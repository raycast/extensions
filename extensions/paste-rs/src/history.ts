import { LocalStorage } from "@raycast/api";

const HISTORY_KEY = "paste-history";
const MAX_ENTRIES = 50;

export type PasteRecord = {
  id: string;
  url: string;
  content: string;
  partial: boolean;
  createdAt: number;
};

export async function getHistory(): Promise<PasteRecord[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as PasteRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function addToHistory(record: Omit<PasteRecord, "id" | "createdAt">): Promise<PasteRecord> {
  const entry: PasteRecord = {
    ...record,
    id: crypto.randomUUID(),
    createdAt: Date.now(),
  };

  const history = await getHistory();
  const next = [entry, ...history].slice(0, MAX_ENTRIES);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(next));

  return entry;
}

export async function removeFromHistory(id: string): Promise<PasteRecord[]> {
  const history = await getHistory();
  const next = history.filter((entry) => entry.id !== id);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(next));

  return next;
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}
