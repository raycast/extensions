import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "markdown-preview-history";
const MAX_ITEMS = 50;

export interface HistoryItem {
  id: string;
  markdown: string;
  title: string;
  createdAt: number;
}

function makeTitle(markdown: string): string {
  const firstLine = markdown
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0);

  if (!firstLine) {
    return "Untitled";
  }

  // Strip common markdown markers for a cleaner list title
  const cleaned = firstLine
    .replace(/^#{1,6}\s+/, "")
    .replace(/^>\s+/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\d+\.\s+/, "")
    .replace(/[*_`~]/g, "")
    .trim();

  if (!cleaned) {
    return "Untitled";
  }

  return cleaned.length > 60 ? `${cleaned.slice(0, 57)}...` : cleaned;
}

export async function getHistory(): Promise<HistoryItem[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function setHistory(items: HistoryItem[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/**
 * Save markdown to history. If the same content already exists,
 * move it to the top and refresh the timestamp.
 */
export async function saveToHistory(markdown: string): Promise<HistoryItem> {
  const content = markdown.trim();
  const items = await getHistory();
  const existing = items.find((item) => item.markdown === content);

  let next: HistoryItem[];

  if (existing) {
    next = [
      { ...existing, createdAt: Date.now(), title: makeTitle(content) },
      ...items.filter((item) => item.id !== existing.id),
    ];
  } else {
    const item: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      markdown: content,
      title: makeTitle(content),
      createdAt: Date.now(),
    };
    next = [item, ...items];
  }

  if (next.length > MAX_ITEMS) {
    next = next.slice(0, MAX_ITEMS);
  }

  await setHistory(next);
  return next[0];
}

export async function removeFromHistory(id: string): Promise<void> {
  const items = await getHistory();
  await setHistory(items.filter((item) => item.id !== id));
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(STORAGE_KEY);
}
