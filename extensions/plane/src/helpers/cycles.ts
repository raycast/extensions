type CycleDates = {
  start_date?: string | null;
  end_date?: string | null;
};

type CycleCounts = {
  total_issues?: number;
  completed_issues?: number;
  cancelled_issues?: number;
};

/** A cycle is active when start ≤ now ≤ end (same rule as `cycle_view=current` in Plane v1). */
export function isCycleActive(cycle: CycleDates, now: Date = new Date()): boolean {
  if (!cycle.start_date || !cycle.end_date) return false;
  const start = new Date(cycle.start_date).getTime();
  // A date-only end ("2026-10-20") means the whole day.
  const endValue = /^\d{4}-\d{2}-\d{2}$/.test(cycle.end_date) ? `${cycle.end_date}T23:59:59.999` : cycle.end_date;
  const end = new Date(endValue).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return start <= now.getTime() && now.getTime() <= end;
}

export function getCycleProgress(cycle: CycleCounts) {
  const total = cycle.total_issues ?? 0;
  const done = (cycle.completed_issues ?? 0) + (cycle.cancelled_issues ?? 0);
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return { total, done, percent };
}

export function formatCycleProgress(cycle: CycleCounts): string {
  const { total, done, percent } = getCycleProgress(cycle);
  return total === 0 ? "No work items" : `${done}/${total} done · ${percent}%`;
}
