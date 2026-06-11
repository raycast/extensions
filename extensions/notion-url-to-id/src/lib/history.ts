import { LocalStorage } from "@raycast/api";

import { resolveNotionPageName } from "./notion";

const STORAGE_KEY = "notion-id-history";
const MAX_HISTORY_ITEMS = 250;

export interface NotionIdHistoryEntry {
  notionId: string;
  pageName: string;
  sourceUrl?: string;
  folder?: string;
  nameLocked?: boolean;
  createdAt: string;
  lastCopiedAt: string;
  pinned: boolean;
}

interface RecordHistoryEntryInput {
  notionId: string;
  pageName: string;
  sourceUrl?: string | null;
}

const FALLBACK_PAGE_NAME_PATTERN = /^notion page [a-f0-9]{8}$/i;

function isHistoryEntry(value: unknown): value is NotionIdHistoryEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Partial<NotionIdHistoryEntry>;

  return (
    typeof entry.notionId === "string" &&
    typeof entry.pageName === "string" &&
    (typeof entry.sourceUrl === "undefined" || typeof entry.sourceUrl === "string") &&
    (typeof entry.folder === "undefined" || typeof entry.folder === "string") &&
    (typeof entry.nameLocked === "undefined" || typeof entry.nameLocked === "boolean") &&
    typeof entry.createdAt === "string" &&
    typeof entry.lastCopiedAt === "string" &&
    typeof entry.pinned === "boolean"
  );
}

function isFallbackPageName(value: string): boolean {
  return FALLBACK_PAGE_NAME_PATTERN.test(value.trim());
}

function getEntryActivityDate(entry: NotionIdHistoryEntry): string {
  return entry.lastCopiedAt || entry.createdAt;
}

export function sortHistoryEntries(entries: NotionIdHistoryEntry[]): NotionIdHistoryEntry[] {
  return [...entries].sort((left, right) => {
    if (left.pinned !== right.pinned) {
      return left.pinned ? -1 : 1;
    }

    return getEntryActivityDate(right).localeCompare(getEntryActivityDate(left));
  });
}

function normalizeHistoryEntry(entry: NotionIdHistoryEntry): NotionIdHistoryEntry {
  const pageName = resolveNotionPageName({
    notionId: entry.notionId,
    sourceUrl: entry.sourceUrl,
    title: entry.pageName,
  });
  const folder = entry.folder?.trim() || undefined;

  if (pageName === entry.pageName && folder === entry.folder) {
    return entry;
  }

  return {
    ...entry,
    folder,
    pageName,
  };
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

    const filteredEntries = parsed.filter(isHistoryEntry);
    const entries = filteredEntries.map(normalizeHistoryEntry);
    const didNormalize = entries.some(
      (entry, index) =>
        entry.pageName !== filteredEntries[index].pageName || entry.folder !== filteredEntries[index].folder,
    );

    if (didNormalize) {
      await saveHistoryEntries(entries);
    }

    return sortHistoryEntries(entries);
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
    const incomingName = input.pageName.trim();
    if (!existing.nameLocked && incomingName) {
      if (isFallbackPageName(existing.pageName) || !isFallbackPageName(incomingName)) {
        existing.pageName = incomingName;
      }
    }
    existing.sourceUrl = input.sourceUrl ?? existing.sourceUrl;
    existing.lastCopiedAt = now;
  } else {
    entries.push({
      notionId: input.notionId,
      pageName: input.pageName,
      sourceUrl: input.sourceUrl ?? undefined,
      folder: undefined,
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

export async function deleteHistoryEntry(notionId: string): Promise<NotionIdHistoryEntry[]> {
  const entries = await getHistoryEntries();
  const updatedEntries = entries.filter((entry) => entry.notionId !== notionId);

  if (updatedEntries.length === entries.length) {
    return entries;
  }

  await saveHistoryEntries(updatedEntries);
  return sortHistoryEntries(updatedEntries);
}

export async function setHistoryEntryFolder(
  notionId: string,
  folder: string | undefined,
): Promise<NotionIdHistoryEntry[]> {
  const entries = await getHistoryEntries();
  const entry = entries.find((item) => item.notionId === notionId);

  if (!entry) {
    return entries;
  }

  entry.folder = folder?.trim() || undefined;
  await saveHistoryEntries(entries);
  return sortHistoryEntries(entries);
}

export async function renameHistoryEntry(notionId: string, pageName: string): Promise<NotionIdHistoryEntry[]> {
  const trimmedName = pageName.trim();
  const entries = await getHistoryEntries();
  const entry = entries.find((item) => item.notionId === notionId);

  if (!entry || !trimmedName) {
    return entries;
  }

  entry.pageName = trimmedName;
  entry.nameLocked = true;
  await saveHistoryEntries(entries);
  return sortHistoryEntries(entries);
}

export async function deleteHistoryFolder(folder: string): Promise<NotionIdHistoryEntry[]> {
  const entries = await getHistoryEntries();
  const updatedEntries = entries.map((entry) => {
    if (entry.folder !== folder) {
      return entry;
    }

    return {
      ...entry,
      folder: undefined,
    };
  });

  await saveHistoryEntries(updatedEntries);
  return sortHistoryEntries(updatedEntries);
}
