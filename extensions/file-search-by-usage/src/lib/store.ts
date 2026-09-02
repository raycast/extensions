import { LocalStorage } from "@raycast/api";
import { VisitLog } from "./types";
import { canonicalPath, pathExists } from "./read-dir";
import {
  Abbreviations,
  emsScore,
  mergeAbbreviation,
  pruneVisits,
  recordEms,
} from "./history";

const KEY = "visits";

const EMPTY: VisitLog = { tick: 0, items: {} };

/** Loads the event-clock usage log used for ranking. */
export async function loadVisitLog(): Promise<VisitLog> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as VisitLog;
    if (typeof parsed?.tick === "number" && parsed.items) return parsed;
  } catch {
    // Invalid storage starts with an empty log.
  }
  return EMPTY;
}

async function save(log: VisitLog): Promise<void> {
  await LocalStorage.setItem(KEY, JSON.stringify(log));
}

/** Records a visit against current storage to avoid stale-view overwrites. */
export async function recordVisit(path: string): Promise<VisitLog> {
  const loaded = await loadVisitLog();
  // Canonical paths merge usage across aliases.
  const updated = recordEms(loaded, canonicalPath(path), Date.now());

  const { log, pruned } = pruneVisits(updated);
  const final = pruned > 0 ? dropMissing(log) : log;
  await save(final);
  return final;
}

export async function resetVisit(path: string): Promise<VisitLog> {
  const log = await loadVisitLog();
  const items = { ...log.items };
  delete items[canonicalPath(path)];
  delete items[path];
  const next = { tick: log.tick, items };
  await save(next);
  return next;
}

export async function clearVisits(): Promise<VisitLog> {
  await LocalStorage.removeItem(KEY);
  return EMPTY;
}

/** Forget entries whose file no longer exists. Only run when pruning fired. */
function dropMissing(log: VisitLog): VisitLog {
  const items: VisitLog["items"] = {};
  for (const [key, visit] of Object.entries(log.items)) {
    if (pathExists(key)) items[key] = visit;
  }
  return { tick: log.tick, items };
}

export { emsScore };

const ABBREV_KEY = "abbreviations";

export async function loadAbbreviations(): Promise<Abbreviations> {
  const raw = await LocalStorage.getItem<string>(ABBREV_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Abbreviations)
      : {};
  } catch {
    return {};
  }
}

export async function recordAbbreviation(
  normalizedQuery: string,
  target: string,
): Promise<Abbreviations> {
  if (normalizedQuery.trim() === "") return loadAbbreviations();
  const next = mergeAbbreviation(
    await loadAbbreviations(),
    normalizedQuery.trim().toLowerCase(),
    canonicalPath(target),
  );
  await LocalStorage.setItem(ABBREV_KEY, JSON.stringify(next));
  return next;
}

const PINS_KEY = "pins";

/** Loads pinned starting locations. */
export async function loadPins(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(PINS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((p): p is string => typeof p === "string")
      : [];
  } catch {
    return [];
  }
}

export async function togglePin(rawTarget: string): Promise<string[]> {
  const target = canonicalPath(rawTarget);
  const pins = await loadPins();
  const next = pins.includes(target)
    ? pins.filter((p) => p !== target)
    : [...pins, target];
  await LocalStorage.setItem(PINS_KEY, JSON.stringify(next));
  return next;
}

const SEARCHES_KEY = "searches";
const MAX_SEARCHES = 30;

export async function loadSearches(): Promise<string[]> {
  const raw = await LocalStorage.getItem<string>(SEARCHES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((q): q is string => typeof q === "string")
      : [];
  } catch {
    return [];
  }
}

/** Records distinct queries in most-recent-first order. */
export async function recordSearch(query: string): Promise<string[]> {
  const trimmed = query.trim();
  if (trimmed === "") return loadSearches();
  const existing = await loadSearches();
  const next = [trimmed, ...existing.filter((q) => q !== trimmed)].slice(
    0,
    MAX_SEARCHES,
  );
  await LocalStorage.setItem(SEARCHES_KEY, JSON.stringify(next));
  return next;
}
