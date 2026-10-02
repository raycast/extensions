import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { LocalStorage } from "@raycast/api";
import { DownloadKind, DownloadSnapshot, knownTotalBytes } from "./download-session.js";

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

// ---------------------------------------------------------------------------
// Storage. Writes are chained so two downloads finishing together can't drop
// each other's entry in a read-modify-write race. The chain is per command,
// though (each command runs its own copy of this module), and LocalStorage has
// no lock, so a write can also be checked afterwards and re-applied if another
// command's concurrent write replaced it.
// ---------------------------------------------------------------------------

let writeChain: Promise<unknown> = Promise.resolve();

// What the user deleted (Remove, Clear History), stored apart from the list so
// a write check in another command can tell a deliberate deletion from a
// concurrent write that dropped its entry, and doesn't bring it back.
const DELETIONS_KEY = "download-history-deletions-v1";
const REMOVED_LIMIT = 200;

export type HistoryDeletions = {
  /** When the history was last cleared (ms). */
  clearedAt: number;
  /** IDs removed since then, oldest first: one by one, or by the clear itself. */
  removed: string[];
};

export function parseDeletions(raw: string | undefined): HistoryDeletions {
  try {
    const d = JSON.parse(raw ?? "") as Partial<HistoryDeletions> | null;
    return {
      clearedAt: typeof d?.clearedAt === "number" ? d.clearedAt : 0,
      removed: Array.isArray(d?.removed) ? d.removed.filter((id): id is string => typeof id === "string") : [],
    };
  } catch {
    return { clearedAt: 0, removed: [] };
  }
}

/**
 * True when the user removed the entry, or cleared the history after it was
 * recorded at `recordedAt`. A clear in the entry's own millisecond counts only
 * when the clear listed it, so a download recorded right after a clear stays.
 */
export function wasDeleted(deletions: HistoryDeletions, id: string, recordedAt: number): boolean {
  return deletions.removed.includes(id) || deletions.clearedAt > recordedAt;
}

/** Save a deletion marker. Throws when it can't be saved. */
async function saveDeletion(change: (d: HistoryDeletions) => HistoryDeletions): Promise<void> {
  const d = change(parseDeletions(await LocalStorage.getItem<string>(DELETIONS_KEY)));
  await LocalStorage.setItem(DELETIONS_KEY, JSON.stringify({ ...d, removed: d.removed.slice(-REMOVED_LIMIT) }));
}

/** How long after a write to check that another command's concurrent write didn't undo it. */
const VERIFY_DELAY_MS = 500;
const VERIFY_ATTEMPTS = 2;

/**
 * Apply `change` to the stored list. `written` settles once it's saved;
 * `verified` settles after `applied` has been checked a moment later (and the
 * change re-applied if another command's write undid it). `verified` never
 * rejects.
 *
 * `before` runs in the same queue step, just ahead of the change: a deletion
 * saves its marker there, so no other write can land in between, and a marker
 * that can't be saved rejects `written` with the list untouched.
 */
function mutate(
  change: (list: HistoryEntry[]) => HistoryEntry[],
  applied?: (list: HistoryEntry[]) => boolean | Promise<boolean>,
  attempts = VERIFY_ATTEMPTS,
  before?: () => Promise<void>,
): { written: Promise<HistoryEntry[]>; verified: Promise<void> } {
  const written = writeChain.then(async () => {
    await before?.();
    const list = change(parseHistory(await LocalStorage.getItem<string>(STORAGE_KEY)));
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return list;
  });
  writeChain = written.catch(() => undefined);
  const verified =
    applied && attempts > 0
      ? written
          .then(() => new Promise((resolve) => setTimeout(resolve, VERIFY_DELAY_MS)))
          .then(async () => {
            if (!(await applied(await loadHistory()))) await mutate(change, applied, attempts - 1).verified;
          })
          .catch(() => undefined)
      : written.then(
          () => undefined,
          () => undefined,
        );
  return { written, verified };
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  await writeChain;
  return parseHistory(await LocalStorage.getItem<string>(STORAGE_KEY));
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
    const recordedAt = Date.now();
    const { written, verified } = mutate(
      (list) => addEntry(list, recorded),
      // Missing because the user removed it or cleared the history (maybe in
      // the History command) is fine; only a concurrent write's loss is re-applied.
      async (list) =>
        list.some((e) => e.id === recorded.id) ||
        wasDeleted(parseDeletions(await LocalStorage.getItem<string>(DELETIONS_KEY)), recorded.id, recordedAt),
    );
    await written;
    // Wait for the check too: a no-view command (Fast Download) may end as soon as this returns.
    await verified;
  } catch (error) {
    console.error("Could not record download history", error);
  }
}

/**
 * Remove one entry. Rejects, leaving it in place, when the deletion can't be
 * saved — otherwise a download's pending check could bring it back.
 */
export function removeFromHistory(id: string): Promise<HistoryEntry[]> {
  // The check runs in the background, so the History list updates right away.
  return mutate(
    (list) => removeEntry(list, id),
    (list) => !list.some((e) => e.id === id),
    VERIFY_ATTEMPTS,
    () => saveDeletion((d) => ({ ...d, removed: [...d.removed.filter((r) => r !== id), id] })),
  ).written;
}

/** Clear the history. Rejects, leaving it as it was, when the clear can't be saved. */
export function clearHistory(): Promise<HistoryEntry[]> {
  // Everything recorded before now is covered by `clearedAt`; the entries being
  // cleared are listed too, for those recorded in this same millisecond. Newest
  // last, so they're the ones kept within the limit.
  return mutate(
    () => [],
    undefined,
    VERIFY_ATTEMPTS,
    async () => {
      const cleared = parseHistory(await LocalStorage.getItem<string>(STORAGE_KEY)).map((e) => e.id);
      await saveDeletion(() => ({ clearedAt: Date.now(), removed: cleared.reverse() }));
    },
  ).written;
}
