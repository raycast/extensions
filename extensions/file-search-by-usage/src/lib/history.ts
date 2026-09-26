import { Visit, VisitLog } from "./types";

/** Usage half-life on the event clock, measured in recorded opens. */
const HALF_LIFE_ACTIONS = 120;
export const LAMBDA = Math.LN2 / HALF_LIFE_ACTIONS;

/** Upper bound of the exponential moving sum. */
export const MAX_EMS = 1 / (1 - Math.exp(-LAMBDA));

/** Bring a stored EMS up to the current tick. */
export function emsScore(visit: Visit | undefined, tick: number): number {
  if (!visit) return 0;
  // Fall back to the raw count when stored EMS data is invalid.
  const ems = Number.isFinite(visit.ems)
    ? visit.ems
    : Math.min(visit.count ?? 0, MAX_EMS);
  const at = Number.isFinite(visit.tick) ? visit.tick : tick;
  return ems * Math.exp(-LAMBDA * Math.max(0, tick - at));
}

/** Records an open and advances the event clock. */
export function recordEms(log: VisitLog, key: string, nowMs: number): VisitLog {
  const existing = log.items[key];
  const decayed = emsScore(existing, log.tick);
  return {
    tick: log.tick + 1,
    items: {
      ...log.items,
      [key]: {
        count: (existing?.count ?? 0) + 1,
        lastVisit: nowMs,
        ems: decayed + 1,
        tick: log.tick,
      },
    },
  };
}

/** Pruning thresholds for negligible and low-scoring visits. */
const MIN_EMS = 0.01;
export const MAX_ENTRIES = 2000;

export function pruneVisits(log: VisitLog): { log: VisitLog; pruned: number } {
  const alive = Object.entries(log.items).filter(
    ([, v]) => emsScore(v, log.tick) >= MIN_EMS,
  );
  const kept =
    alive.length <= MAX_ENTRIES
      ? alive
      : alive
          .sort((a, b) => emsScore(b[1], log.tick) - emsScore(a[1], log.tick))
          .slice(0, MAX_ENTRIES);
  return {
    log: { tick: log.tick, items: Object.fromEntries(kept) },
    pruned: Object.keys(log.items).length - kept.length,
  };
}

/** query (normalized) -> path -> how many times that pairing was chosen. */
export type Abbreviations = Record<string, Record<string, number>>;

/** Maximum learned queries. */
const MAX_ABBREVIATIONS = 300;
/** Maximum learned targets per query. */
export const MAX_PER_ABBREVIATION = 5;

/** Learns and bounds a query-to-target association. */
export function mergeAbbreviation(
  all: Abbreviations,
  normalizedQuery: string,
  canonicalTarget: string,
): Abbreviations {
  if (normalizedQuery === "") return all;

  const forQuery = { ...(all[normalizedQuery] ?? {}) };
  forQuery[canonicalTarget] = (forQuery[canonicalTarget] ?? 0) + 1;

  const trimmed = Object.fromEntries(
    Object.entries(forQuery)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_PER_ABBREVIATION),
  );

  // Reinsert the query so the cap evicts the least recently reinforced entry.
  const next: Abbreviations = { ...all };
  delete next[normalizedQuery];
  next[normalizedQuery] = trimmed;

  const keys = Object.keys(next);
  for (const stale of keys.slice(
    0,
    Math.max(0, keys.length - MAX_ABBREVIATIONS),
  )) {
    delete next[stale];
  }

  return next;
}
