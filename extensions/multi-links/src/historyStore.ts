import { LocalStorage } from "@raycast/api";
import type { ExtractedItem, ExtractedType } from "./extractUrls";

export const HISTORY_KEY = "history.entries";
export const MAX_ENTRIES = 100;
export const MAX_ITEMS_PER_ENTRY = 20;

export interface HistoryEntry {
  id: string; // crypto.randomUUID()
  timestamp: number; // Date.now()
  source: "selection" | "clipboard" | "history" | "filter";
  totalCount: number; // actual extracted count BEFORE the 20-item cap
  openedCount: number; // actually opened (may differ from totalCount on partial failure)
  truncated: boolean; // true iff totalCount > items.length (i.e. cap hit)
  items: Array<{ raw: string; url: string; type: ExtractedType }>;
  typesBreakdown: Record<string, number>;
  pinned?: boolean; // optional; only ever `true` (never `false`) — see LD-P4-05
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as HistoryEntry[];
  } catch {
    return []; // corrupted JSON → defensive empty list (Open Risk in 04-CONTEXT.md)
  }
}

async function saveHistory(entries: HistoryEntry[]): Promise<void> {
  await LocalStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

function trim(entries: HistoryEntry[]): HistoryEntry[] {
  const pinned = entries.filter((e) => e.pinned === true);
  const unpinned = entries.filter((e) => e.pinned !== true);
  const keepCount = Math.max(0, MAX_ENTRIES - pinned.length);
  const keepUnpinned = unpinned.slice(0, keepCount);
  return [...pinned, ...keepUnpinned];
}

function computeBreakdown(items: ExtractedItem[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const item of items) {
    counts[item.type] = (counts[item.type] ?? 0) + 1;
  }
  return counts;
}

function newId(): string {
  const g = globalThis as { crypto?: { randomUUID?: () => string } };
  if (g.crypto && typeof g.crypto.randomUUID === "function") {
    return g.crypto.randomUUID();
  }
  // Fallback for older Node runtimes (Open Risk in 04-CONTEXT.md).
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function recordHistory(
  items: ExtractedItem[],
  source: HistoryEntry["source"],
  openedCount: number,
): Promise<void> {
  if (items.length === 0) return; // nothing to record
  const totalCount = items.length;
  const capped = items.slice(0, MAX_ITEMS_PER_ENTRY).map((i) => ({
    raw: i.raw,
    url: i.url,
    type: i.type,
  }));
  const entry: HistoryEntry = {
    id: newId(),
    timestamp: Date.now(),
    source,
    totalCount,
    openedCount,
    truncated: totalCount > capped.length,
    items: capped,
    typesBreakdown: computeBreakdown(items),
  };
  const existing = await loadHistory();
  // Newest first: prepend, then trim (pin-protected).
  const next = trim([entry, ...existing]);
  await saveHistory(next);
}

export async function deleteEntry(id: string): Promise<void> {
  const existing = await loadHistory();
  const next = existing.filter((e) => e.id !== id);
  await saveHistory(next);
}

export async function togglePin(id: string): Promise<void> {
  // LD-P4-05: flip `true ↔ undefined` (never `false`). Keeps JSON small.
  const existing = await loadHistory();
  const next = existing.map((e) => (e.id === id ? { ...e, pinned: e.pinned === true ? undefined : true } : e));
  await saveHistory(next);
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(HISTORY_KEY);
}
