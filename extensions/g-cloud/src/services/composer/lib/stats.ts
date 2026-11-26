// Pure performance statistics for DAG runs and task instances.
// Durations are computed from end - start (finished items only); running/queued are excluded.

import { DagRun, TaskInstance } from "./types";

export interface Summary {
  n: number;
  min: number;
  p50: number;
  p90: number;
  max: number;
  mean: number;
}

export function percentile(sorted: number[], p: number): number {
  if (!sorted.length) return NaN;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function summarize(values: number[]): Summary | undefined {
  const v = values.filter((x) => Number.isFinite(x) && x >= 0).sort((a, b) => a - b);
  if (!v.length) return undefined;
  return {
    n: v.length,
    min: v[0],
    p50: percentile(v, 50),
    p90: percentile(v, 90),
    max: v[v.length - 1],
    mean: v.reduce((s, x) => s + x, 0) / v.length,
  };
}

function seconds(start?: string | null, end?: string | null): number | undefined {
  if (!start || !end) return undefined;
  const a = Date.parse(start);
  const b = Date.parse(end);
  return Number.isNaN(a) || Number.isNaN(b) ? undefined : Math.max(0, (b - a) / 1000);
}

/** Wall-clock duration of a finished run, else undefined. */
export function runSeconds(r: DagRun): number | undefined {
  if (r.state === "running" || r.state === "queued") return undefined;
  return seconds(r.start_date, r.end_date);
}

const BARS = ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"];

/**
 * Text sparkline, oldest -> newest (pass values in chronological order). Ported from the dbtcloud
 * extension with fixes: flat series match the input length, undefined points render as "·".
 */
export function sparkline(values: (number | undefined)[], width = 30): string {
  const v = values.slice(-width);
  const nums = v.filter((x): x is number => x !== undefined && Number.isFinite(x));
  if (!nums.length) return "";
  const min = Math.min(...nums);
  const range = Math.max(...nums) - min;
  return v
    .map((x) => {
      if (x === undefined || !Number.isFinite(x)) return "·";
      if (range === 0) return BARS[3];
      return BARS[Math.min(BARS.length - 1, Math.floor(((x - min) / range) * BARS.length))];
    })
    .join("");
}

/** Regression signal: latest value vs p50 of the earlier values. */
export function regression(chronological: number[], factor = 2): { ratio: number; flagged: boolean } | undefined {
  if (chronological.length < 4) return undefined;
  const last = chronological[chronological.length - 1];
  const base = summarize(chronological.slice(0, -1));
  if (!base || base.p50 <= 0) return undefined;
  const ratio = last / base.p50;
  return { ratio, flagged: ratio >= factor };
}

const FAILED_TI = new Set(["failed", "upstream_failed"]);

/** One data point per (run, task): mapped instances collapse to their wall-clock span. */
export interface TaskRunPoint {
  taskId: string;
  runId: string;
  start?: string;
  end?: string;
  seconds?: number;
  state: string; // worst state across instances
  instances: number;
  failedInstances: number;
  tries: number; // max try_number
  operator?: string | null;
  sample: TaskInstance; // representative instance (worst state) for drilling into logs
}

const STATE_RANK = ["failed", "upstream_failed", "up_for_retry", "running", "deferred", "queued", "success", "skipped"];
function rank(s: string | null | undefined): number {
  const i = STATE_RANK.indexOf(s ?? "");
  return i < 0 ? STATE_RANK.length : i;
}

export function taskRunPoints(tis: TaskInstance[]): TaskRunPoint[] {
  const groups = new Map<string, TaskInstance[]>();
  for (const t of tis) {
    const k = `${t.dag_run_id}\u0000${t.task_id}`;
    const g = groups.get(k);
    if (g) g.push(t);
    else groups.set(k, [t]);
  }
  return [...groups.values()].map((g) => {
    const sample = [...g].sort((a, b) => rank(a.state) - rank(b.state))[0];
    const finished =
      g.every((t) => !!t.end_date) && !g.some((t) => ["running", "queued", "deferred"].includes(t.state ?? ""));
    const starts = g
      .map((t) => t.start_date)
      .filter((s): s is string => !!s)
      .sort();
    const ends = g
      .map((t) => t.end_date)
      .filter((s): s is string => !!s)
      .sort();
    const start = starts[0];
    const end = ends[ends.length - 1];
    const ran = g.some((t) => t.state !== "skipped" && t.state !== "upstream_failed");
    return {
      taskId: sample.task_id,
      runId: sample.dag_run_id,
      start,
      end,
      seconds: finished && ran ? seconds(start, end) : undefined,
      state: sample.state ?? "none",
      instances: g.length,
      failedInstances: g.filter((t) => FAILED_TI.has(t.state ?? "")).length,
      tries: Math.max(...g.map((t) => t.try_number)),
      operator: sample.operator,
      sample,
    };
  });
}

export interface TaskStats {
  taskId: string;
  operator?: string | null;
  points: TaskRunPoint[]; // chronological (oldest first)
  summary?: Summary;
  runs: number;
  failedRuns: number;
  retriedRuns: number;
  mapped: boolean;
  regression?: { ratio: number; flagged: boolean };
}

export function taskStats(tis: TaskInstance[]): TaskStats[] {
  const byTask = new Map<string, TaskRunPoint[]>();
  for (const p of taskRunPoints(tis)) byTask.set(p.taskId, [...(byTask.get(p.taskId) ?? []), p]);
  return [...byTask.entries()].map(([taskId, pts]) => {
    const points = pts.sort((a, b) => (a.start ?? "").localeCompare(b.start ?? ""));
    const secs = points.map((p) => p.seconds).filter((x): x is number => x !== undefined);
    return {
      taskId,
      operator: points[points.length - 1]?.operator,
      points,
      summary: summarize(secs),
      runs: points.length,
      failedRuns: points.filter((p) => FAILED_TI.has(p.state)).length,
      retriedRuns: points.filter((p) => p.tries > 1).length,
      mapped: points.some((p) => p.instances > 1 || p.sample.map_index >= 0),
      regression: regression(secs),
    };
  });
}

/**
 * Health of DAG runs: run-state success alone overstates health where the leaf task is
 * all_done, so also count runs that contain any failed/upstream_failed task instance.
 */
export function runHealth(runs: DagRun[], tis?: TaskInstance[]) {
  const finished = runs.filter((r) => r.state === "success" || r.state === "failed");
  const success = finished.filter((r) => r.state === "success").length;
  let greenWithFailedTasks: number | undefined;
  if (tis) {
    const badRuns = new Set(tis.filter((t) => FAILED_TI.has(t.state ?? "")).map((t) => t.dag_run_id));
    greenWithFailedTasks = finished.filter((r) => r.state === "success" && badRuns.has(r.dag_run_id)).length;
  }
  return { finished: finished.length, success, failed: finished.length - success, greenWithFailedTasks };
}

export function pct(n: number, d: number): string {
  return d ? `${Math.round((n / d) * 100)}%` : "-";
}
