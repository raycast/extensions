import { LocalStatus, WorkItem } from "./types";

export function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export function todayIso(): string {
  return isoDay(new Date());
}

/** Working days (Mon–Fri) from max(today, start) through finish, inclusive. */
export function remainingWorkingDays(
  startDate?: string,
  finishDate?: string,
): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = startDate ? new Date(startDate) : today;
  const from = start > today ? start : today;
  const to = finishDate ? new Date(finishDate) : from;

  const days: string[] = [];
  const cursor = new Date(from);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= to) {
    const dow = cursor.getDay(); // 0 Sun … 6 Sat
    if (dow !== 0 && dow !== 6) days.push(isoDay(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}

// Type tiebreak: a lingering bug is risk/rework, so bugs sort ahead of stories,
// then tasks, within an equal priority.
const TYPE_RANK: Record<string, number> = {
  Bug: 0,
  "User Story": 1,
  Task: 2,
};

const ADO_ACTIVE = new Set(["active", "in progress", "committed", "doing"]);

function isInProgress(item: WorkItem, status: LocalStatus): boolean {
  return status === "in-progress" || ADO_ACTIVE.has(item.state.toLowerCase());
}

/**
 * Deterministic default sequence: in-progress first (finish WIP before starting
 * new), then priority (P1→P4), then type (Bug→Story→Task), then id. Returns ids.
 */
export function orderItems(
  items: WorkItem[],
  statusOf: (id: number) => LocalStatus,
): number[] {
  return [...items]
    .sort((a, b) => {
      // Sprint items are the committed work — the whole sprint block ranks
      // ahead of backlog (items pulled in from outside the current sprint).
      const asp = a.inSprint === false ? 1 : 0;
      const bsp = b.inSprint === false ? 1 : 0;
      if (asp !== bsp) return asp - bsp;

      const aip = isInProgress(a, statusOf(a.id)) ? 0 : 1;
      const bip = isInProgress(b, statusOf(b.id)) ? 0 : 1;
      if (aip !== bip) return aip - bip;

      const ap = a.priority ?? 5;
      const bp = b.priority ?? 5;
      if (ap !== bp) return ap - bp;

      const at = TYPE_RANK[a.type] ?? 3;
      const bt = TYPE_RANK[b.type] ?? 3;
      if (at !== bt) return at - bt;

      return a.id - b.id;
    })
    .map((i) => i.id);
}

/** `primary` order first (deduped), then any ids from `fallback` not yet included. */
export function reconcileOrder(
  primary: number[],
  fallback: number[],
): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of [...primary, ...fallback]) {
    if (!seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export interface DayBucket {
  day: string; // YYYY-MM-DD
  items: WorkItem[];
}

export interface Projection {
  perDay: DayBucket[];
  todays: WorkItem[]; // first day's slice — the live to-do
  overflow: WorkItem[]; // won't fit in the remaining days at capacity
  load: number; // open items to schedule
  capacityTotal: number; // capacity × remaining days
  fits: boolean;
  bufferDays: number; // empty trailing days (only meaningful when it fits)
}

/**
 * Project an ordered queue onto the remaining working days. `openItems` must be
 * pre-sorted by default rank (so any ids missing from `order` — newly created
 * items — append sensibly). Fills each day up to an even per-day target capped
 * at `capacity`; anything past capacity×days becomes overflow (never dumped).
 */
export function projectPlan(
  order: number[],
  openItems: WorkItem[],
  days: string[],
  capacity: number,
): Projection {
  const byId = new Map(openItems.map((i) => [i.id, i]));

  // Ordered open items: saved order first (still-open only), then any leftovers.
  const inOrder: WorkItem[] = [];
  const seen = new Set<number>();
  for (const id of order) {
    const wi = byId.get(id);
    if (wi) {
      inOrder.push(wi);
      seen.add(id);
    }
  }
  for (const wi of openItems) {
    if (!seen.has(wi.id)) inOrder.push(wi);
  }

  const load = inOrder.length;
  const cap = Math.max(1, capacity);

  if (days.length === 0) {
    // Sprint is over (or misconfigured): it all lands on a single "today".
    return {
      perDay: load > 0 ? [{ day: todayIso(), items: inOrder }] : [],
      todays: inOrder,
      overflow: [],
      load,
      capacityTotal: 0,
      fits: false,
      bufferDays: 0,
    };
  }

  const capacityTotal = cap * days.length;
  const fits = load <= capacityTotal;
  // Even, sustainable pace when it fits; hard cap when it doesn't.
  const perDayTarget = Math.min(
    cap,
    Math.max(1, Math.ceil(load / days.length)),
  );

  const perDay: DayBucket[] = days.map((day) => ({ day, items: [] }));
  const overflow: WorkItem[] = [];
  let idx = 0;
  for (const wi of inOrder) {
    while (idx < days.length && perDay[idx].items.length >= perDayTarget) idx++;
    if (idx >= days.length) overflow.push(wi);
    else perDay[idx].items.push(wi);
  }

  const daysUsed = perDay.filter((d) => d.items.length > 0).length;
  return {
    perDay,
    todays: perDay[0]?.items ?? [],
    overflow,
    load,
    capacityTotal,
    fits,
    bufferDays: fits ? days.length - daysUsed : 0,
  };
}
