import {
  collectorStatus,
  ensureCollector,
  readStream,
  rotateStream,
  ROTATE_BYTES,
  type CollectorPaths,
  type CollectorStatus,
} from "./collector.ts";
import { readEvents, pairSessions, MAX_SESSION_MINUTES, type LogScan } from "./log.ts";
import { setupFromBlocked, type OwnedCategory } from "./focusSetup.ts";
import { readCategories } from "./focusCategories.ts";
import type { GoalBlocks, SessionStore, SyncState } from "./store.ts";
import type { FocusEvent, PendingStart } from "./types.ts";

const BACKFILL_DAYS = 1;

const OVERLAP_MS = 60_000;

export const COLLECTOR_DOWN: CollectorStatus = { running: false, bytes: 0 };

export type SyncResult = {
  added: number;
  collector: CollectorStatus;
  records: number;
  parsed: number;
  warning?: string;
};

export type StreamHarvest = {
  events: FocusEvent[];
  records: number;
  offset: number;
  reset: boolean;
  continuous: boolean;
  collector: CollectorStatus;
};

export type SyncSources = {
  stream(offset: number): Promise<StreamHarvest>;
  archive(since: Date): Promise<LogScan>;
  categories(): Promise<OwnedCategory[]>;
  streamBytes(): Promise<number>;
};

export function blocksFromEvents(
  events: FocusEvent[],
  owned: OwnedCategory[],
  known: Record<string, GoalBlocks>,
): Record<string, GoalBlocks> {
  const learned = { ...known };
  for (const event of [...events].sort((a, b) => a.at - b.at)) {
    if (event.type !== "start" || !event.blocked || !event.goal) continue;
    const setup = setupFromBlocked(event.goal, event.blocked, owned);
    learned[event.goal] = { categories: setup.categories, mode: setup.mode, skipped: setup.skipped };
  }
  return learned;
}

export function dedupe(events: FocusEvent[]): FocusEvent[] {
  const seen = new Set<string>();
  const out: FocusEvent[] = [];
  for (const e of events) {
    const key = `${e.type}:${e.at}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

async function harvestStream(paths: CollectorPaths, offset: number): Promise<StreamHarvest> {
  let events: FocusEvent[] = [];
  let records = 0;
  let nextOffset = offset;
  let reset = false;
  let collector: CollectorStatus;

  try {
    collector = await ensureCollector(paths);
    const read = await readStream(paths, offset);
    events = read.events;
    records = read.records;
    nextOffset = read.nextOffset;
    reset = read.reset;

    if (collector.bytes > ROTATE_BYTES) {
      await rotateStream(paths);
      nextOffset = 0;
      reset = true;
      collector = await ensureCollector(paths);
    }
  } catch {
    collector = await collectorStatus(paths).catch(() => COLLECTOR_DOWN);
  }

  const continuous = offset > 0 && !reset && collector.running && !collector.spawned;
  return { events, records, offset: nextOffset, reset, continuous, collector };
}

export function liveSources(paths: CollectorPaths): SyncSources {
  return {
    stream: (offset) => harvestStream(paths, offset),
    archive: readEvents,
    categories: readCategories,
    streamBytes: async () => (await collectorStatus(paths)).bytes,
  };
}

function archiveWindow(cursor: number | null, now: number): Date {
  if (cursor === null) return new Date(now - BACKFILL_DAYS * 86_400_000);
  return new Date(Math.max(0, cursor - OVERLAP_MS));
}

async function recordSessions(
  target: SessionStore,
  state: SyncState,
  events: FocusEvent[],
  cursor: number,
  stream: { offset: number; reset: boolean },
  owned: OwnedCategory[],
): Promise<number> {
  const { sessions, pending, consumed } = pairSessions(events, state.pending);
  const added = await target.add(sessions);

  await target.mutateState((current) => ({
    ...current,
    cursor: Math.min(Date.now(), Math.max(current.cursor ?? 0, cursor)),
    pending: mergePending(current.pending, pending, consumed),
    streamOffset: stream.reset ? stream.offset : Math.max(current.streamOffset, stream.offset),
    goalBlocks: blocksFromEvents(events, owned, current.goalBlocks),
  }));

  return added;
}

function mergePending(onDisk: PendingStart[], computed: PendingStart[], consumed: number[]): PendingStart[] {
  const merged = new Map<number, PendingStart>();
  for (const p of onDisk) merged.set(p.at, p);
  for (const p of computed) merged.set(p.at, p);
  for (const at of consumed) merged.delete(at);

  const cutoff = Date.now() - MAX_SESSION_MINUTES * 60_000;
  return [...merged.values()]
    .filter((p) => p.at >= cutoff)
    .sort((a, b) => a.at - b.at)
    .slice(-50);
}

export async function syncSessions(target: SessionStore, sources: SyncSources): Promise<SyncResult> {
  const state = await target.readState();
  const startedAt = Date.now();

  const stream = await sources.stream(state.streamOffset);

  let archive: LogScan = { events: [], records: 0 };
  let warning: string | undefined;
  if (!stream.continuous || state.cursor === null) {
    try {
      archive = await sources.archive(archiveWindow(state.cursor, startedAt));
    } catch (error) {
      if (stream.events.length === 0) throw error;
      warning = error instanceof Error ? error.message : String(error);
    }
  }

  const events = dedupe([...stream.events, ...archive.events]);
  const spellsOutBlocks = events.some((e) => e.type === "start" && e.blocked);
  const owned = spellsOutBlocks ? await sources.categories().catch(() => []) : [];
  const added = await recordSessions(target, state, events, startedAt, stream, owned);

  return {
    added,
    collector: stream.collector,
    records: stream.records + archive.records,
    parsed: stream.events.length + archive.events.length,
    warning,
  };
}

export async function syncIfStale(
  target: SessionStore,
  sources: SyncSources,
  maxAgeMs = 120_000,
): Promise<SyncResult | null> {
  const state = await target.readState();
  if (state.cursor !== null) {
    const age = Date.now() - state.cursor;
    const unread = (await sources.streamBytes().catch(() => 0)) > state.streamOffset;
    if (!unread && age >= 0 && age < maxAgeMs) return null;
  }
  return syncSessions(target, sources);
}
