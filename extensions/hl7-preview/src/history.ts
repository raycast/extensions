import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { createHash } from "node:crypto";
import { parseMessage, splitHL7 } from "./hl7.ts";
import { messageSummary, patientOf } from "./render.ts";
import { type Source, readSource } from "./sources.ts";

/**
 * A previous view. It keeps a copy of the message text, so it reopens as it was seen even when
 * the file has moved or changed since. Stored in Raycast's local encrypted storage, and only when
 * the user turns on the "Keep Past Views" preference, as it holds patient data.
 */
export interface HistoryEntry {
  key: string;
  name: string;
  path?: string;
  text: string;
  /** Patient names in the view, e.g. "Max Muster". */
  patient: string;
  /** Patient IDs and dates of birth, for search. */
  keywords: string[];
  summary: string;
  openedAt: number;
}

const STORAGE_KEY = "history";
const MAX_ENTRIES = 50;
/** Larger inputs are not kept as a copy; they reopen from their file only. */
const MAX_TEXT_LENGTH = 500_000;

/** Preference off → deletes the stored views (patient data). */
export function loadHistory(): Promise<HistoryEntry[]> {
  return enqueue(readHistory);
}

async function readHistory(): Promise<HistoryEntry[]> {
  if (!isKeepingPastViews()) {
    await LocalStorage.removeItem(STORAGE_KEY);
    return [];
  }
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as HistoryEntry[]).map((e) => ({
      ...e,
      patient: e.patient ?? "",
      keywords: e.keywords ?? [],
    }));
  } catch {
    return [];
  }
}

export function isKeepingPastViews(): boolean {
  return getPreferenceValues<Preferences>().keepPastViews === true;
}

// One queue for every read and write: each change runs on the latest list, so a slow save can't
// restore or drop entries, nor write views back after the preference is turned off.
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => undefined);
  return run;
}

function update(change: (entries: HistoryEntry[]) => HistoryEntry[]): Promise<void> {
  return enqueue(async () => {
    const entries = change(await readHistory());
    // Checked again here: the preference can turn off while this save waits in the queue.
    if (!isKeepingPastViews()) return;
    await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
  }).catch(() => undefined);
}

export function entryKey(source: Source): string {
  return source.path ? `file:${source.path}` : `text:${createHash("sha1").update(source.text).digest("hex")}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function toEntry(source: Source): HistoryEntry {
  const patients: ReturnType<typeof patientOf>[] = [];
  const summaries: string[] = [];
  for (const raw of splitHL7(source.text)) {
    const message = parseMessage(raw);
    patients.push(patientOf(message));
    summaries.push(messageSummary(message));
  }
  return {
    key: entryKey(source),
    name: source.name,
    path: source.path,
    text: source.text.length <= MAX_TEXT_LENGTH ? source.text : "",
    patient: unique(patients.map((p) => p.name)).join(", "),
    keywords: unique(patients.flatMap((p) => [p.id, p.born])),
    summary: unique(summaries).join(", "),
    openedAt: Date.now(),
  };
}

/** Moves the sources to the top. No-op unless Keep Past Views is on. */
export async function remember(sources: Source[]): Promise<void> {
  if (!isKeepingPastViews()) return;
  // A pasted message too large to copy could never reopen, so it is not kept.
  const added = sources.filter((s) => s.path || s.text.length <= MAX_TEXT_LENGTH).map(toEntry);
  if (added.length === 0) return;
  const keys = new Set(added.map((e) => e.key));
  await update((entries) => [...added, ...entries.filter((e) => !keys.has(e.key))]);
}

export function forget(key: string): Promise<void> {
  return update((entries) => entries.filter((e) => e.key !== key));
}

export function clearHistory(): Promise<void> {
  return update(() => []);
}

/** The stored copy of a view, else its file as it is now. */
export async function openEntry(entry: HistoryEntry): Promise<Source | undefined> {
  if (entry.text) return { name: entry.name, path: entry.path, text: entry.text };
  if (entry.path) return readSource(entry.path).catch(() => undefined);
  return undefined;
}

/** Title for lists and menus: the patient first, as that is what people search for. */
export function entryTitle(entry: HistoryEntry): string {
  return entry.patient || entry.name;
}
