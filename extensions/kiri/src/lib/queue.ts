/**
 * Finished blocks waiting to be saved to Kiri, and the list of blocks finished in Raycast.
 * Pure functions only.
 */
import { ApiError, type FocusSessionBody } from "./api";

/** Most blocks kept while offline; the oldest are dropped first. */
export const MAX_QUEUE = 200;
/** A block that failed this many times is dropped. */
export const MAX_ATTEMPTS = 20;
/** Blocks kept in Focus History. */
export const MAX_HISTORY = 500;

export interface QueueItem {
  body: FocusSessionBody;
  attempts: number;
  /** The connection the block was finished under: it is only ever sent with that connection's token. */
  connectionId: string;
}

export interface HistoryEntry {
  id: string;
  task: string;
  minutes: number;
  startedAt: number;
  endedAt: number;
  sound: string;
  /** "local": not for Kiri; "queued": waiting to be saved; "saved": in the Kiri history. */
  kiri: "local" | "queued" | "saved";
}

export function buildSessionBody(entry: HistoryEntry): FocusSessionBody {
  return {
    client_block_id: entry.id,
    started_at: new Date(entry.startedAt).toISOString(),
    duration_seconds: Math.round(entry.minutes * 60),
    ambient: entry.sound,
    binaural: "",
    intent: entry.task,
  };
}

export function enqueue(queue: readonly QueueItem[], body: FocusSessionBody, connectionId: string): QueueItem[] {
  if (queue.some((q) => q.body.client_block_id === body.client_block_id)) return [...queue];
  return [...queue, { body, attempts: 0, connectionId }].slice(-MAX_QUEUE);
}

export interface FlushResult {
  remaining: QueueItem[];
  /** client_block_ids Kiri now has. */
  sentIds: string[];
  dropped: number;
  unauthorized: boolean;
  kirisEarned: number;
}

/**
 * Send queued blocks in order. Stops at the first failure worth retrying (offline, server
 * trouble, rate limit) and keeps the rest. Blocks Kiri rejects for good (another 4xx, such as a
 * block older than 48 hours) are dropped so one bad block never holds back the others. Kiri
 * treats a repeated client_block_id as the same block, so sending twice is safe.
 */
export async function flushQueue(
  queue: readonly QueueItem[],
  send: (body: FocusSessionBody) => Promise<number>,
): Promise<FlushResult> {
  const remaining = [...queue];
  const sentIds: string[] = [];
  let dropped = 0;
  let kirisEarned = 0;
  while (remaining.length > 0) {
    const item = remaining[0];
    try {
      kirisEarned = Math.round((kirisEarned + (await send(item.body))) * 100) / 100;
      remaining.shift();
      sentIds.push(item.body.client_block_id);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if (status === 401) return { remaining, sentIds, dropped, unauthorized: true, kirisEarned };
      // Rate limited or offline: try later without counting it as a failure.
      if (status === 429 || status === 0) break;
      const retryable = !(err instanceof ApiError) || err.retryable;
      if (retryable) {
        const attempts = item.attempts + 1;
        if (attempts >= MAX_ATTEMPTS) {
          remaining.shift();
          dropped++;
          continue;
        }
        remaining[0] = { ...item, attempts };
        break;
      }
      remaining.shift();
      dropped++;
    }
  }
  return { remaining, sentIds, dropped, unauthorized: false, kirisEarned };
}

/** Read the stored queue, skipping anything malformed. */
export function parseQueue(value: unknown): QueueItem[] {
  if (!Array.isArray(value)) return [];
  const out: QueueItem[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const item = raw as { body?: Partial<FocusSessionBody>; attempts?: unknown; connectionId?: unknown };
    const b = item.body;
    if (
      !b ||
      typeof b.client_block_id !== "string" ||
      typeof b.started_at !== "string" ||
      typeof b.duration_seconds !== "number"
    )
      continue;
    if (typeof item.connectionId !== "string" || !item.connectionId) continue;
    out.push({
      body: {
        client_block_id: b.client_block_id,
        started_at: b.started_at,
        duration_seconds: b.duration_seconds,
        ambient: typeof b.ambient === "string" ? b.ambient : "",
        binaural: typeof b.binaural === "string" ? b.binaural : "",
        intent: typeof b.intent === "string" ? b.intent : "",
      },
      attempts: typeof item.attempts === "number" ? item.attempts : 0,
      connectionId: item.connectionId,
    });
  }
  return out.slice(-MAX_QUEUE);
}

export function addHistory(history: readonly HistoryEntry[], entry: HistoryEntry): HistoryEntry[] {
  if (history.some((h) => h.id === entry.id)) return [...history];
  return [entry, ...history].slice(0, MAX_HISTORY);
}

export function markHistory(
  history: readonly HistoryEntry[],
  ids: readonly string[],
  kiri: HistoryEntry["kiri"],
): HistoryEntry[] {
  if (ids.length === 0) return [...history];
  const set = new Set(ids);
  return history.map((h) => (set.has(h.id) ? { ...h, kiri } : h));
}

export function parseHistory(value: unknown): HistoryEntry[] {
  if (!Array.isArray(value)) return [];
  const out: HistoryEntry[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const h = raw as Record<string, unknown>;
    if (
      typeof h.id !== "string" ||
      typeof h.minutes !== "number" ||
      typeof h.startedAt !== "number" ||
      typeof h.endedAt !== "number"
    )
      continue;
    out.push({
      id: h.id,
      task: typeof h.task === "string" ? h.task : "",
      minutes: h.minutes,
      startedAt: h.startedAt,
      endedAt: h.endedAt,
      sound: typeof h.sound === "string" ? h.sound : "",
      kiri: h.kiri === "queued" || h.kiri === "saved" ? h.kiri : "local",
    });
  }
  return out.slice(0, MAX_HISTORY);
}

/** Local calendar day, "2026-11-23". */
export function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface DayGroup {
  day: string;
  entries: HistoryEntry[];
  minutes: number;
}

/** Blocks grouped by the local day they ended, newest day first. */
export function groupByDay(history: readonly HistoryEntry[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  const sorted = [...history].sort((a, b) => b.endedAt - a.endedAt);
  for (const h of sorted) {
    const key = dayKey(h.endedAt);
    let g = groups.get(key);
    if (!g) {
      g = { day: key, entries: [], minutes: 0 };
      groups.set(key, g);
    }
    g.entries.push(h);
    g.minutes += h.minutes;
  }
  return [...groups.values()];
}

/** A random UUID v4. */
export function newId(): string {
  return crypto.randomUUID();
}
