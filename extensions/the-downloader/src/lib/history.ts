import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { DownloadKind, DownloadSnapshot, knownTotalBytes } from "./download-session.js";
import { jsonStore } from "./json-store.js";

/** One finished (or failed) download, as shown in the Download History command. */
export type HistoryEntry = {
  id: string;
  url: string;
  kind: DownloadKind;
  status: "done" | "failed";
  title?: string;
  uploader?: string;
  thumbnail?: string;
  source?: string;
  duration?: number;
  format?: string;
  folder: string;
  filePath?: string;
  bytes?: number;
  /** Files or tracks saved (galleries, Spotify). */
  items?: number;
  error?: string;
  startedAt: number;
  finishedAt: number;
};

export type HistoryFilter = "all" | "video" | "audio" | "images" | "spotify" | "website" | "transcript" | "failed";

const STORAGE_KEY = "download-history-v1";
export const HISTORY_LIMIT = 300;

const KINDS: DownloadKind[] = ["video", "audio", "gallery", "spotify", "website", "transcript", "thumbnail"];

function isEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") return false;
  const e = value as Partial<HistoryEntry>;
  return (
    typeof e.id === "string" &&
    typeof e.url === "string" &&
    typeof e.folder === "string" &&
    typeof e.startedAt === "number" &&
    typeof e.finishedAt === "number" &&
    (e.status === "done" || e.status === "failed") &&
    KINDS.includes(e.kind as DownloadKind)
  );
}

/** Parse stored history, dropping anything malformed instead of failing the whole list. */
export function parseHistory(raw: string | undefined): HistoryEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isEntry) : [];
  } catch {
    return [];
  }
}

/** Build a history entry from a finished session. Cancelled downloads are not recorded. */
export function entryFromSnapshot(s: DownloadSnapshot, id = randomUUID()): HistoryEntry | undefined {
  if (s.status !== "done" && s.status !== "failed") return undefined;
  return {
    id,
    url: s.url,
    kind: s.kind,
    status: s.status,
    title: s.title,
    uploader: s.meta?.uploader,
    thumbnail: s.meta?.thumbnail,
    source: s.meta?.source,
    duration: s.meta?.duration,
    format: s.format,
    folder: s.folder,
    filePath: s.filePath,
    bytes: knownTotalBytes(s),
    items: s.items > 0 ? s.items : undefined,
    error: s.status === "failed" ? s.resultMessage : undefined,
    startedAt: s.startedAt,
    finishedAt: s.finishedAt ?? s.startedAt,
  };
}

/** Newest first, one entry per id, at most `limit`. */
export function addEntry(list: HistoryEntry[], entry: HistoryEntry, limit = HISTORY_LIMIT): HistoryEntry[] {
  return [entry, ...list.filter((e) => e.id !== entry.id)].slice(0, limit);
}

export function removeEntry(list: HistoryEntry[], id: string): HistoryEntry[] {
  return list.filter((e) => e.id !== id);
}

export function matchesFilter(entry: HistoryEntry, filter: HistoryFilter): boolean {
  switch (filter) {
    case "all":
      return true;
    case "failed":
      return entry.status === "failed";
    case "images":
      return entry.kind === "gallery" || entry.kind === "thumbnail";
    default:
      return entry.kind === filter;
  }
}

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Sections for the history list: Today, Yesterday, then one per calendar day. */
export function groupByDay(entries: HistoryEntry[], now = Date.now()): { title: string; entries: HistoryEntry[] }[] {
  const today = startOfDay(now);
  const yesterday = startOfDay(today - 1);
  const groups = new Map<number, HistoryEntry[]>();
  for (const entry of [...entries].sort((a, b) => b.finishedAt - a.finishedAt)) {
    const day = startOfDay(entry.finishedAt);
    groups.set(day, [...(groups.get(day) ?? []), entry]);
  }
  return [...groups.entries()].map(([day, list]) => ({
    title:
      day === today
        ? "Today"
        : day === yesterday
          ? "Yesterday"
          : new Date(day).toLocaleDateString(undefined, {
              weekday: "long",
              month: "short",
              day: "numeric",
              year: new Date(day).getFullYear() === new Date(now).getFullYear() ? undefined : "numeric",
            }),
    entries: list,
  }));
}

// Storage (see jsonStore: writes are serialized).
const store = jsonStore<HistoryEntry>(STORAGE_KEY, parseHistory);

export function loadHistory(): Promise<HistoryEntry[]> {
  return store.load();
}

/** Record a finished download. Never throws: history is a convenience, not part of the download. */
export async function recordDownload(entry: HistoryEntry | undefined): Promise<void> {
  if (!entry) return;
  try {
    if (entry.bytes === undefined && entry.filePath) {
      const stat = fs.statSync(entry.filePath, { throwIfNoEntry: false });
      if (stat?.isFile()) entry = { ...entry, bytes: stat.size };
    }
    const recorded = entry;
    await store.mutate((list) => addEntry(list, recorded));
  } catch (error) {
    console.error("Could not record download history", error);
  }
}

export function removeFromHistory(id: string): Promise<HistoryEntry[]> {
  return store.mutate((list) => removeEntry(list, id));
}

export function clearHistory(): Promise<HistoryEntry[]> {
  return store.mutate(() => []);
}
