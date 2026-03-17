import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "notion-id-history";
const MAX_HISTORY_ITEMS = 250;

export interface NotionIdHistoryEntry {
  notionId: string;
  pageName: string;
  sourceUrl?: string;
  createdAt: string;
  lastCopiedAt: string;
  pinned: boolean;
}

interface RecordHistoryEntryInput {
  notionId: string;
  pageName: string;
  sourceUrl?: string | null;
}

function isHistoryEntry(value: unknown): value is NotionIdHistoryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<NotionIdHistoryEntry>;

  return (
    typeof entry.notionId === "string" &&
    typeof entry.pageName === "string" &&
    typeof entry.createdAt === "string" &&
    typeof entry.lastCopiedAt === "string" &&
    typeof entry.pinned === "boolean"
  );
}

export function sortHistoryEntries(entries: NotionIdHistoryEntry[]): NotionIdHistoryEntry[] {
  return [...entries].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return right.lastCopiedAt.localeCompare(left.lastCopiedAt);
  });
}

export async function getHistoryEntries(): Promise<NotionIdHistoryEntry[]> {
  const rawEntries = await LocalStorage.getItem<string>(STORAGE_KEY);

  if (!rawEntries) {
    return [];
  }

  try {
    const parsed = JSON.parse(rawEntries);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return sortHistoryEntries(parsed.filter(isHistoryEntry));
  } catch {
    return [];
  }
}

async function saveHistoryEntries(entries: NotionIdHistoryEntry[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(sortHistoryEntries(entries).slice(0, MAX_HISTORY_ITEMS)));
}

export async function recordHistoryEntry(input: RecordHistoryEntryInput): Promise<NotionIdHistoryEntry[]> {
  const now = new Date().toISOString();
  const entries = await getHistoryEntries();
  const existing = entries.find((entry) => entry.notionId === input.notionId);

  if (existing) {
    existing.pageName = input.pageName || existing.pageName;
    existing.sourceUrl = input.sourceUrl ?? existing.sourceUrl;
    existing.lastCopiedAt = now;
  } else {
    entries.push({
      notionId: input.notionId,
      pageName: input.pageName,
      sourceUrl: input.sourceUrl ?? undefined,
      createdAt: now,
      lastCopiedAt: now,
      pinned: false,
    });
  }

  await saveHistoryEntries(entries);
  return sortHistoryEntries(entries);
}

export async function togglePinnedHistoryEntry(notionId: string): Promise<NotionIdHistoryEntry[]> {
  const entries = await getHistoryEntries();
  const entry = entries.find((item) => item.notionId === notionId);

  if (!entry) {
    return entries;
  }

  entry.pinned = !entry.pinned;
  await saveHistoryEntries(entries);
  return sortHistoryEntries(entries);
}

export async function markHistoryEntryCopied(notionId: string): Promise<NotionIdHistoryEntry[]> {
  const entries = await getHistoryEntries();
  const entry = entries.find((item) => item.notionId === notionId);

  if (!entry) {
    return entries;
  }

  entry.lastCopiedAt = new Date().toISOString();
  await saveHistoryEntries(entries);
  return sortHistoryEntries(entries);
}
