import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { createHash } from "node:crypto";
import { parseHL7 } from "./hl7";
import { messageSummary, patientOf } from "./render";
import { Source, readSource } from "./sources";

/**
 * A previous view. It keeps a copy of the message text, so it reopens as it was seen even when
 * the file has moved or changed since. Stored in Raycast's local encrypted storage, and only when
 * the user turns on the "Keep past views" preference, as it holds patient data.
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

export async function loadHistory(): Promise<HistoryEntry[]> {
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

/**
 * Every change to the history runs through this queue, one after another, each on the latest
 * stored list. So a slow save can never restore a removed entry or drop a newer one.
 */
let queue: Promise<void> = Promise.resolve();

function update(change: (entries: HistoryEntry[]) => HistoryEntry[]): Promise<void> {
  queue = queue
    .then(async () => {
      const entries = change(await loadHistory());
      await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
    })
    .catch(() => undefined);
  return queue;
}

function entryKey(source: Source): string {
  return source.path ? `file:${source.path}` : `text:${createHash("sha1").update(source.text).digest("hex")}`;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function toEntry(source: Source): HistoryEntry {
  const messages = parseHL7(source.text);
  const patients = messages.map(patientOf);
  return {
    key: entryKey(source),
    name: source.name,
    path: source.path,
    text: source.text.length <= MAX_TEXT_LENGTH ? source.text : "",
    patient: unique(patients.map((p) => p.name)).join(", "),
    keywords: unique(patients.flatMap((p) => [p.id, p.born])),
    summary: unique(messages.map(messageSummary)).join(", "),
    openedAt: Date.now(),
  };
}

/** Moves the sources to the top of the history, when the user keeps past views. */
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
