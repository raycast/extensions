import { LocalStorage } from "@raycast/api";
import { dataGeneration, withStorageLock } from "./storage-lock";
import { VisitLog } from "./types";
import { canonicalPathAsync } from "./read-dir";
import {
  Abbreviations,
  MAX_EMS,
  emsScore,
  mergeAbbreviation,
  pruneVisits,
  recordEms,
} from "./history";

const KEY = "visits";

const EMPTY: VisitLog = { tick: 0, items: {} };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function nonnegativeNumber(value: unknown, fallback = 0): number {
  return isFiniteNumber(value) && value >= 0 ? value : fallback;
}

/** Move a previously saved visible alias onto its now-known storage key. */
function mergeVisitAlias(
  log: VisitLog,
  visiblePath: string,
  storagePath: string,
): VisitLog {
  if (visiblePath === storagePath || log.items[visiblePath] === undefined)
    return log;
  const visible = log.items[visiblePath];
  const canonical = log.items[storagePath];
  const items = { ...log.items };
  delete items[visiblePath];
  items[storagePath] = {
    count: visible.count + (canonical?.count ?? 0),
    lastVisit: Math.max(visible.lastVisit, canonical?.lastVisit ?? 0),
    ems: emsScore(visible, log.tick) + emsScore(canonical, log.tick),
    tick: log.tick,
  };
  return { tick: log.tick, items };
}

/** Loads the event-clock usage log used for ranking. */
export async function loadVisitLog(): Promise<VisitLog> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      !isRecord(parsed) ||
      !isFiniteNumber(parsed.tick) ||
      parsed.tick < 0 ||
      !isRecord(parsed.items)
    )
      return EMPTY;
    const tick = parsed.tick;
    // One damaged entry must not disable subsequent writes or discard the
    // healthy entries. Keep the legacy count fallback for unavailable EMS.
    const items = Object.fromEntries(
      Object.entries(parsed.items).flatMap(([key, visit]) => {
        if (!isRecord(visit)) return [];
        const count = nonnegativeNumber(visit.count);
        return [
          [
            key,
            {
              count,
              lastVisit: nonnegativeNumber(visit.lastVisit),
              ems: isFiniteNumber(visit.ems)
                ? visit.ems
                : Math.min(count, MAX_EMS),
              tick: nonnegativeNumber(visit.tick, tick),
            },
          ],
        ];
      }),
    );
    return { tick, items };
  } catch {
    // Invalid storage starts with an empty log.
  }
  return EMPTY;
}

async function save(log: VisitLog, assertCurrent: () => void): Promise<void> {
  assertCurrent();
  await LocalStorage.setItem(KEY, JSON.stringify(log));
}

/** Records a visit against current storage to avoid stale-view overwrites. */
export async function recordVisit(
  path: string,
  generation = dataGeneration(),
  knownTarget?: string,
): Promise<VisitLog> {
  const target = knownTarget ?? (await canonicalPathAsync(path));
  return withStorageLock(async (assertCurrent) => {
    const loaded = mergeVisitAlias(await loadVisitLog(), path, target);
    // A later successful resolve also migrates an earlier timeout fallback.
    const updated = recordEms(loaded, target, Date.now());

    const { log } = pruneVisits(updated);
    await save(log, assertCurrent);
    return log;
  }, generation);
}

export async function resetVisit(
  path: string,
  knownTarget?: string,
  generation = dataGeneration(),
): Promise<VisitLog> {
  const target = knownTarget ?? (await canonicalPathAsync(path));
  return withStorageLock(async (assertCurrent) => {
    const log = await loadVisitLog();
    const items = { ...log.items };
    delete items[target];
    delete items[path];
    const next = { tick: log.tick, items };
    await save(next, assertCurrent);
    return next;
  }, generation);
}

export async function clearVisits(): Promise<VisitLog> {
  return withStorageLock(async (assertCurrent) => {
    assertCurrent();
    await LocalStorage.removeItem(KEY);
    return EMPTY;
  }, dataGeneration());
}

export { emsScore };

const ABBREV_KEY = "abbreviations";

export async function loadAbbreviations(): Promise<Abbreviations> {
  const raw = await LocalStorage.getItem<string>(ABBREV_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).flatMap(([query, targets]) => {
        if (!isRecord(targets)) return [];
        const valid = Object.entries(targets).filter(
          (pair): pair is [string, number] =>
            isFiniteNumber(pair[1]) && pair[1] > 0,
        );
        return valid.length === 0 ? [] : [[query, Object.fromEntries(valid)]];
      }),
    );
  } catch {
    return {};
  }
}

export async function recordAbbreviation(
  normalizedQuery: string,
  target: string,
  generation = dataGeneration(),
  knownTarget?: string,
): Promise<Abbreviations> {
  if (normalizedQuery.trim() === "") return loadAbbreviations();
  const resolvedTarget = knownTarget ?? (await canonicalPathAsync(target));
  return withStorageLock(async (assertCurrent) => {
    const existing = await loadAbbreviations();
    const normalized = normalizedQuery.trim().toLowerCase();
    const aliases = { ...(existing[normalized] ?? {}) };
    if (target !== resolvedTarget && aliases[target] !== undefined) {
      aliases[resolvedTarget] =
        (aliases[resolvedTarget] ?? 0) + aliases[target];
      delete aliases[target];
    }
    const next = mergeAbbreviation(
      { ...existing, [normalized]: aliases },
      normalized,
      resolvedTarget,
    );
    assertCurrent();
    await LocalStorage.setItem(ABBREV_KEY, JSON.stringify(next));
    return next;
  }, generation);
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

export async function togglePin(
  rawTarget: string,
  knownTarget?: string,
  generation = dataGeneration(),
): Promise<string[]> {
  const target = knownTarget ?? (await canonicalPathAsync(rawTarget));
  return withStorageLock(async (assertCurrent) => {
    const pins = await loadPins();
    const wasPinned = pins.includes(target) || pins.includes(rawTarget);
    const withoutAliases = pins.filter((p) => p !== target && p !== rawTarget);
    const next = wasPinned ? withoutAliases : [...withoutAliases, target];
    assertCurrent();
    await LocalStorage.setItem(PINS_KEY, JSON.stringify(next));
    return next;
  }, generation);
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
export async function recordSearch(
  query: string,
  generation = dataGeneration(),
): Promise<string[]> {
  return withStorageLock(async (assertCurrent) => {
    const trimmed = query.trim();
    if (trimmed === "") return loadSearches();
    const existing = await loadSearches();
    const next = [trimmed, ...existing.filter((q) => q !== trimmed)].slice(
      0,
      MAX_SEARCHES,
    );
    assertCurrent();
    await LocalStorage.setItem(SEARCHES_KEY, JSON.stringify(next));
    return next;
  }, generation);
}
