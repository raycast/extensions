import { LocalStorage, environment } from "@raycast/api";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { MonthKey, isMonthKey } from "./month";

export const CHAIN_COUNT = 5;
export const CHAIN_IDS = Array.from({ length: CHAIN_COUNT }, (_, index) => `chain-${index + 1}`);

export interface ChainData {
  /** Crossed-off days, keyed by `YYYY-MM`. */
  marks: Record<MonthKey, number[]>;
  /** The month currently on display. Never advances on its own. */
  viewMonth?: MonthKey;
  /**
   * Bumped on every save and written to both stores. If one write fails the
   * revisions diverge, and the higher one is taken whole on the next read —
   * merging the older store back in would resurrect whatever it deleted.
   */
  revision?: number;
}

export const EMPTY_CHAIN: ChainData = { marks: {} };

/**
 * Marks live in two places: a JSON file under the extension's support directory,
 * which survives extension reloads and updates, and LocalStorage, which is read
 * first so the menu bar can draw itself without touching the disk. Both are
 * written together and reconciled by revision on read, so a wipe of either one
 * is recoverable without an interrupted save undoing a deletion.
 */
function chainFile(id: string): string {
  return path.join(environment.supportPath, `${id}.json`);
}

function sanitize(value: unknown): ChainData {
  if (typeof value !== "object" || value === null) return EMPTY_CHAIN;
  const raw = value as Partial<ChainData>;
  const marks: Record<MonthKey, number[]> = {};

  for (const [month, days] of Object.entries(raw.marks ?? {})) {
    if (!isMonthKey(month) || !Array.isArray(days)) continue;
    const valid = days.filter((day) => Number.isInteger(day) && day >= 1 && day <= 31);
    if (valid.length > 0) {
      marks[month] = [...new Set(valid)].sort((a, b) => a - b);
    }
  }

  return {
    marks,
    viewMonth: isMonthKey(raw.viewMonth) ? raw.viewMonth : undefined,
    revision: typeof raw.revision === "number" && Number.isFinite(raw.revision) ? raw.revision : undefined,
  };
}

function parse(json: string | undefined): ChainData | undefined {
  if (!json) return undefined;
  try {
    return sanitize(JSON.parse(json));
  } catch {
    return undefined;
  }
}

function merge(primary: ChainData | undefined, backup: ChainData | undefined): ChainData {
  if (!primary) return backup ?? EMPTY_CHAIN;
  if (!backup) return primary;

  // A save stamps both stores with the same revision, so a mismatch means one
  // of the two writes did not land. The newer store is taken whole — unioning
  // equal or older marks would resurrect days the newer snapshot deleted.
  const primaryRevision = primary.revision ?? 0;
  const backupRevision = backup.revision ?? 0;
  if (backupRevision > primaryRevision) return backup;
  return primary;
}

export async function loadChain(id: string): Promise<ChainData> {
  const [cached, persisted] = await Promise.all([
    LocalStorage.getItem<string>(id).then(parse).catch(noneOnError),
    fs
      .readFile(chainFile(id), "utf8")
      .then(parse)
      .catch(() => undefined),
  ]);
  return merge(cached, persisted);
}

function noneOnError(): undefined {
  return undefined;
}

/**
 * Stamp a save with the next revision. Uses the clock so the number is
 * meaningful, but never goes backwards even if the clock does, and never
 * repeats within the same millisecond.
 */
let lastRevision = 0;

function stampRevision(data: ChainData): ChainData {
  const next = Math.max(Date.now(), (data.revision ?? 0) + 1, lastRevision + 1);
  lastRevision = next;
  return { ...data, revision: next };
}

const pendingSaves = new Map<string, Promise<unknown>>();

function enqueueSave<T>(id: string, work: () => Promise<T>): Promise<T> {
  const previous = pendingSaves.get(id) ?? Promise.resolve();
  const next = previous.then(work, work);
  pendingSaves.set(id, next);
  return next;
}

async function persistChain(id: string, data: ChainData): Promise<void> {
  const json = JSON.stringify(data);

  // The file is the durable copy, so write it first: if it fails, LocalStorage
  // is left untouched and both stores stay on the previous revision together.
  await fs.mkdir(environment.supportPath, { recursive: true });
  // Write through a temporary file so an interrupted write can't truncate the history.
  const temporary = `${chainFile(id)}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, json, "utf8");
  await fs.rename(temporary, chainFile(id));

  await LocalStorage.setItem(id, json);
}

/**
 * Apply a mutation to the latest persisted chain, then write both stores.
 * Callers pass an updater so two in-flight actions compose instead of each
 * saving over the same rendered snapshot.
 */
export async function saveChain(id: string, apply: (current: ChainData) => ChainData): Promise<ChainData> {
  return enqueueSave(id, async () => {
    const stamped = stampRevision(apply(await loadChain(id)));
    await persistChain(id, stamped);
    return stamped;
  });
}

export function toggleDay(data: ChainData, month: MonthKey, day: number): ChainData {
  const days = new Set(data.marks[month] ?? []);
  if (!days.delete(day)) {
    days.add(day);
  }

  const marks = { ...data.marks };
  if (days.size > 0) {
    marks[month] = [...days].sort((a, b) => a - b);
  } else {
    delete marks[month];
  }
  return { ...data, marks };
}

export function clearMonth(data: ChainData, month: MonthKey): ChainData {
  const marks = { ...data.marks };
  delete marks[month];
  return { ...data, marks };
}
