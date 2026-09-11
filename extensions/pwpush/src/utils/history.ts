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
    const parsed = JSON.parse(raw) as Array<PushRecord & { apiKey?: string }>;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(({ url, urlToken, name, note, kind, expiresAt, viewsRemaining, createdAt, serverUrl }) => ({
      url,
      urlToken,
      name,
      note,
      kind,
      expiresAt,
      viewsRemaining,
      createdAt,
      serverUrl,
    }));
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
  const deduped = history.filter((item) => item.urlToken !== record.urlToken || item.serverUrl !== record.serverUrl);
  const updated = [record, ...deduped];
  await saveHistory(updated);
  return updated;
}

export async function removeFromHistory(urlToken: string, serverUrl?: string): Promise<PushRecord[]> {
  const history = await loadHistory();
  const updated = serverUrl
    ? history.filter((item) => item.urlToken !== urlToken || item.serverUrl !== serverUrl)
    : history.filter((item) => item.urlToken !== urlToken);
  await saveHistory(updated);
  return updated;
}
