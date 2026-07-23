import { LocalStorage } from "@raycast/api";

export type PushKind = "text" | "url" | "qr" | "file";

export type PushRecord = {
  url: string;
  urlToken: string;
  name?: string;
  note?: string;
  kind: PushKind;
  expiresAt?: string;
  viewsRemaining?: number;
  createdAt: string;
  serverUrl: string;
};

const HISTORY_KEY = "pwpush_history";
const MAX_HISTORY_ITEMS = 100;

export async function loadHistory(): Promise<PushRecord[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as PushRecord[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

export async function saveHistory(history: PushRecord[]): Promise<void> {
  const trimmed = history.slice(0, MAX_HISTORY_ITEMS);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export async function addToHistory(record: PushRecord): Promise<PushRecord[]> {
  const history = await loadHistory();
  const deduped = history.filter((item) => item.urlToken !== record.urlToken);
  const updated = [record, ...deduped];
  await saveHistory(updated);
  return updated;
}

export async function removeFromHistory(urlToken: string): Promise<PushRecord[]> {
  const history = await loadHistory();
  const updated = history.filter((item) => item.urlToken !== urlToken);
  await saveHistory(updated);
  return updated;
}
