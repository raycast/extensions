import { useCachedPromise, usePromise } from "@raycast/utils";
import type { CollectorStatus } from "./collector.ts";
import { collectorStatus, getPreferences, store, syncIfStale, syncSessions } from "./runtime.ts";
import { CALENDAR_WEEKS, computeStats } from "./stats.ts";
import { COLLECTOR_DOWN } from "./sync.ts";
import type { Session, Stats } from "./types.ts";

export type StatsBundle = {
  stats: Stats;
  sessions: Session[];
  totalOnRecord: number;
  firstOnRecord: number | null;
  syncError?: string;
  log?: { records: number; parsed: number };
  collector?: CollectorStatus;
};

type StoredStats = Pick<StatsBundle, "stats" | "sessions" | "totalOnRecord" | "firstOnRecord">;

type SyncReport = {
  added: number;
  syncError?: string;
  log?: { records: number; parsed: number };
  collector: CollectorStatus;
};

async function readStored(from: number, to: number, weekStartsOn: 0 | 1): Promise<StoredStats> {
  const all = await store.all();
  const sessions = all.filter((s) => s.start >= from && s.start < to);

  const now = new Date(Math.min(to, Date.now()));

  return {
    stats: computeStats(sessions, { weekStartsOn, calendarWeeks: CALENDAR_WEEKS, now }),
    sessions,
    totalOnRecord: all.length,
    firstOnRecord: all.reduce<number | null>((min, s) => (min === null || s.start < min ? s.start : min), null),
  };
}

async function runSync(): Promise<SyncReport> {
  let syncError: string | undefined;
  let collector: CollectorStatus | undefined;
  let log: { records: number; parsed: number } | undefined;
  let added = 0;

  try {
    let synced = await syncIfStale();
    if (!synced && (await store.count()) === 0) synced = await syncSessions();
    collector = synced?.collector;
    syncError = synced?.warning;
    added = synced?.added ?? 0;
    log = synced ? { records: synced.records, parsed: synced.parsed } : undefined;
  } catch (error) {
    syncError = error instanceof Error ? error.message : String(error);
  }

  return {
    added,
    syncError,
    log,
    collector: collector ?? (await collectorStatus().catch(() => COLLECTOR_DOWN)),
  };
}

export function useStats(from = 0, to = Number.MAX_SAFE_INTEGER) {
  const prefs = getPreferences();

  const stored = useCachedPromise(readStored, [from, to, prefs.weekStartsOn], { keepPreviousData: true });

  const sync = usePromise(runSync, [], {
    onData: (report) => {
      if (report.added > 0) stored.revalidate();
    },
  });

  const data: StatsBundle | undefined = stored.data && {
    ...stored.data,
    syncError: sync.data?.syncError,
    log: sync.data?.log,
    collector: sync.data?.collector,
  };

  return {
    data,
    isLoading: stored.isLoading || sync.isLoading,
    revalidate: () => {
      stored.revalidate();
      sync.revalidate();
    },
  };
}
