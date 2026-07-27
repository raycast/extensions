/**
 * Aging metrics: how long a pull request has been sitting, how long it's been
 * quiet, and how long someone has been waiting on you.
 *
 * "Updated 3 days ago" tells you when something last moved. It doesn't tell
 * you that a colleague's question has gone unanswered for three weeks, or that
 * a review request has been open longer than the sprint. These turn the same
 * timestamps into the numbers you'd actually triage on.
 *
 * Pure and Raycast-free so the arithmetic can be tested directly. `now` is
 * always injectable for the same reason.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Milliseconds elapsed since an ISO timestamp; 0 if it's unparseable or future. */
export function elapsedSince(iso: string, now = Date.now()): number {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return 0;
  return Math.max(0, now - then);
}

/** Whole days elapsed since an ISO timestamp. */
export function daysSince(iso: string, now = Date.now()): number {
  return Math.floor(elapsedSince(iso, now) / DAY);
}

/**
 * A duration in words, rounded to the unit that reads best: "4 days",
 * "1 month", "3 hours". Long-form on purpose — this appears in prose and
 * metadata, not in a cramped accessory.
 */
export function describeDuration(ms: number): string {
  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

  if (ms < MINUTE) return "moments";
  if (ms < HOUR) return plural(Math.round(ms / MINUTE), "minute");
  if (ms < DAY) return plural(Math.round(ms / HOUR), "hour");

  const days = Math.round(ms / DAY);
  if (days < 31) return plural(days, "day");
  if (days < 365) return plural(Math.round(days / 30), "month");
  return plural(Math.round(days / 365), "year");
}

/** How stale something is, as a band rather than a raw number. */
export type StalenessLevel = "fresh" | "aging" | "stale" | "stalled";

/**
 * Day thresholds for each band. A working week is the line between "normal"
 * and "someone should look at this".
 */
export const STALENESS_THRESHOLDS = { aging: 2, stale: 7, stalled: 30 } as const;

export function stalenessFromDays(days: number): StalenessLevel {
  if (days >= STALENESS_THRESHOLDS.stalled) return "stalled";
  if (days >= STALENESS_THRESHOLDS.stale) return "stale";
  if (days >= STALENESS_THRESHOLDS.aging) return "aging";
  return "fresh";
}

/** The aging picture for one pull request. */
export type Aging = {
  /** Days since the pull request was opened. */
  ageDays: number;
  /** Days since anything at all happened on it. */
  idleDays: number;
  /** Days someone has been waiting on you, or undefined if nobody is. */
  waitingDays?: number;
  level: StalenessLevel;
};

/** Just the timestamps aging needs, so tests don't have to build a whole PR. */
export type AgingInput = {
  createdAt: string;
  lastActivity: string;
  awaitingSince?: string;
};

export function agingOf(pr: AgingInput, now = Date.now()): Aging {
  const idleDays = daysSince(pr.lastActivity, now);
  return {
    ageDays: daysSince(pr.createdAt, now),
    idleDays,
    waitingDays: pr.awaitingSince ? daysSince(pr.awaitingSince, now) : undefined,
    // Something waiting on *you* is judged on how long it's been waiting, not
    // on when the pull request last saw any activity — an active PR with a
    // three-week-old unanswered question is not "fresh".
    level: stalenessFromDays(Math.max(idleDays, pr.awaitingSince ? daysSince(pr.awaitingSince, now) : 0)),
  };
}

/** Aggregate numbers for a whole category, for the summary row. */
export type Summary = {
  count: number;
  /** Median days idle — resistant to one ancient outlier skewing the picture. */
  medianIdleDays: number;
  /** How many have gone a working week or more without activity. */
  staleCount: number;
  /** How many are waiting on you. */
  waitingCount: number;
  /** The longest anyone has been waiting on you, in days. */
  longestWaitDays: number;
  /** Age of the oldest open pull request, in days. */
  oldestDays: number;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

export function summarize(prs: AgingInput[], now = Date.now()): Summary {
  const agings = prs.map((pr) => agingOf(pr, now));
  const waits = agings.map((a) => a.waitingDays).filter((d): d is number => d !== undefined);

  return {
    count: prs.length,
    medianIdleDays: median(agings.map((a) => a.idleDays)),
    staleCount: agings.filter((a) => a.idleDays >= STALENESS_THRESHOLDS.stale).length,
    waitingCount: waits.length,
    longestWaitDays: waits.length > 0 ? Math.max(...waits) : 0,
    oldestDays: agings.length > 0 ? Math.max(...agings.map((a) => a.ageDays)) : 0,
  };
}

/** How the list can be ordered. */
export type SortKey = "activity" | "waiting" | "idle" | "oldest";

export const SORTS: { key: SortKey; title: string }[] = [
  { key: "activity", title: "Most recent activity" },
  { key: "waiting", title: "Waiting on me longest" },
  { key: "idle", title: "Quiet the longest" },
  { key: "oldest", title: "Oldest first" },
];

/** Orders pull requests by the chosen key, newest/most-urgent first. */
export function sortBy<T extends AgingInput & { lastActivity: string }>(prs: T[], key: SortKey): T[] {
  const copy = [...prs];
  switch (key) {
    case "waiting":
      // Anything actually waiting on you outranks everything that isn't,
      // longest wait first; the rest keep recency order underneath.
      return copy.sort((a, b) => {
        const aw = a.awaitingSince ?? "";
        const bw = b.awaitingSince ?? "";
        if (aw && bw) return aw.localeCompare(bw);
        if (aw) return -1;
        if (bw) return 1;
        return b.lastActivity.localeCompare(a.lastActivity);
      });
    case "idle":
      return copy.sort((a, b) => a.lastActivity.localeCompare(b.lastActivity));
    case "oldest":
      return copy.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    case "activity":
    default:
      return copy.sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
  }
}

/** The summary as a single line, for a section subtitle. */
export function describeSummary(summary: Summary): string {
  if (summary.count === 0) return "";
  const parts = [`${summary.count} open`, `median idle ${summary.medianIdleDays}d`];
  if (summary.staleCount > 0) parts.push(`${summary.staleCount} stale`);
  if (summary.waitingCount > 0) parts.push(`${summary.waitingCount} waiting on you`);
  return parts.join(" · ");
}
