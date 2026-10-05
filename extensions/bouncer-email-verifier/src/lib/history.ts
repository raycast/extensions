import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";
import { useCallback, useMemo } from "react";
import type { DomainRecord, EmailRecord } from "./bouncer";

const STORAGE_KEY = "verification-history";
const MAX_ENTRIES = 50;

export type HistoryEntry =
  | { kind: "email"; subject: string; record: EmailRecord; verifiedAt: number }
  | { kind: "domain"; subject: string; record: DomainRecord; verifiedAt: number };

/**
 * Stored history is untrusted input: it may have been written by an older build with a
 * different shape, or hand-edited. Every row is validated before use, and rows written
 * before entries carried a `kind` and `subject` are migrated rather than discarded.
 * Anything still unrecognisable is dropped, because one bad row must not break the command.
 */
function normalizeEntries(raw: unknown): HistoryEntry[] {
  if (!Array.isArray(raw)) return [];

  return raw.flatMap((item): HistoryEntry[] => {
    if (typeof item !== "object" || item === null) return [];
    const candidate = item as Partial<HistoryEntry> & { record?: EmailRecord & DomainRecord };
    const record = candidate.record;
    if (typeof record !== "object" || record === null) return [];

    const verifiedAt = typeof candidate.verifiedAt === "number" ? candidate.verifiedAt : Date.now();

    if (candidate.kind === "domain" || (!candidate.kind && !record.email && record.domain?.name)) {
      const subject = typeof candidate.subject === "string" ? candidate.subject : record.domain?.name;
      return subject ? [{ kind: "domain", subject, record: record as DomainRecord, verifiedAt }] : [];
    }

    const subject = typeof candidate.subject === "string" ? candidate.subject : record.email;
    return typeof subject === "string" && subject
      ? [{ kind: "email", subject, record: record as EmailRecord, verifiedAt }]
      : [];
  });
}

/**
 * Reads straight from LocalStorage before every write. The in-memory copy can still
 * be loading when a verification finishes, and writing from it would drop the history.
 */
async function readStored(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return normalizeEntries(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** An email and its own domain are different checks, so they are keyed separately. */
function keyOf(entry: HistoryEntry): string {
  return `${entry.kind}:${entry.subject}`;
}

/**
 * Every mutation is read-modify-write against a single storage key, so two overlapping
 * ones would both read the same snapshot and the second would discard the first's result.
 * Queueing them means each read sees the previous write. The chain swallows failures so
 * one rejected mutation cannot wedge the queue.
 */
let mutations: Promise<unknown> = Promise.resolve();

function serialize<T>(mutate: () => Promise<T>): Promise<T> {
  const result = mutations.then(mutate, mutate);
  mutations = result.catch(() => undefined);
  return result;
}

export function useHistory() {
  const { saveHistory } = getPreferenceValues<Preferences>();
  const { value, setValue, isLoading } = useLocalStorage<HistoryEntry[]>(STORAGE_KEY, []);
  // useLocalStorage parses the JSON itself, so the same validation has to run on its output.
  // Migrated rows are persisted on the next write, so this self-heals.
  const stored = useMemo(() => normalizeEntries(value), [value]);

  // Anything already on disk stays there when recording is switched off — it is the
  // user's data to delete, not ours. It is simply not shown or added to.
  const entries = saveHistory ? stored : [];

  const save = useCallback(
    async (entry: HistoryEntry) => {
      if (!saveHistory) return;
      await serialize(async () => {
        const current = await readStored();
        const next = [entry, ...current.filter((e) => keyOf(e) !== keyOf(entry))].slice(0, MAX_ENTRIES);
        await setValue(next);
      });
    },
    [saveHistory, setValue],
  );

  const addEmail = useCallback(
    async (record: EmailRecord) => {
      await save({ kind: "email", subject: record.email, record, verifiedAt: Date.now() });
    },
    [save],
  );

  const addDomain = useCallback(
    async (record: DomainRecord) => {
      const subject = record.domain?.name;
      if (!subject) return;
      await save({ kind: "domain", subject, record, verifiedAt: Date.now() });
    },
    [save],
  );

  const remove = useCallback(
    async (entry: HistoryEntry) => {
      await serialize(async () => {
        const current = await readStored();
        await setValue(current.filter((e) => keyOf(e) !== keyOf(entry)));
      });
    },
    [setValue],
  );

  // Queued alongside the others so a verification landing mid-clear cannot resurrect a row.
  const clear = useCallback(async () => {
    await serialize(async () => setValue([]));
  }, [setValue]);

  return {
    entries,
    isLoading,
    enabled: saveHistory,
    /** True when recording is off but old entries are still on disk. */
    hasStoredWhileDisabled: !saveHistory && stored.length > 0,
    addEmail,
    addDomain,
    remove,
    clear,
    entryKey: keyOf,
  };
}

export function formatVerifiedAt(timestamp: number): string {
  const date = new Date(timestamp);
  const elapsedMinutes = Math.round((Date.now() - timestamp) / 60_000);

  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes}m ago`;
  if (elapsedMinutes < 60 * 24) return `${Math.round(elapsedMinutes / 60)}h ago`;
  return date.toLocaleDateString();
}
