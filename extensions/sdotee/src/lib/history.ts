import { LocalStorage } from "@raycast/api";

export interface HistoryItem {
  type: "url" | "text" | "file";
  title: string;
  url: string;
  domain: string;
  slug: string;
  hash?: string;
  fileUrl?: string;
  createdAt: string;
}

const HISTORY_KEY = "history";
const MAX_HISTORY_ITEMS = 500;

export async function getHistory(): Promise<HistoryItem[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export async function addHistoryItem(item: HistoryItem): Promise<void> {
  const history = await getHistory();
  history.unshift(item);
  const trimmed = history.slice(0, MAX_HISTORY_ITEMS);
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export async function removeHistoryItem(
  url: string,
  createdAt?: string,
): Promise<void> {
  const history = await getHistory();
  const filtered = history.filter((item) => {
    if (createdAt) return !(item.url === url && item.createdAt === createdAt);
    return item.url !== url;
  });
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
}
