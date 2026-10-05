/**
 * Deployment metrics client
 *
 * Wraps the deployment-level /api/app_metrics/* endpoints and the system UDFs
 * that power the Convex dashboard's health page. All endpoints are read-only
 * and authenticate with `Authorization: Convex <token>` where the token is
 * either an OAuth access token or a deploy key.
 */

import { CONVEX_CLIENT_ID } from "./constants";

export interface MetricsAuth {
  /** Full deployment URL, e.g. https://name.eu-west-1.convex.cloud */
  deploymentUrl: string;
  /** OAuth access token or deploy key */
  token: string;
}

/** Backend timestamp object used inside window params and timeseries */
interface BackendTimestamp {
  secs_since_epoch: number;
  nanos_since_epoch: number;
}

/** One bucket: [timestamp, value] — value null means "no data" */
export type TimeseriesPoint = [BackendTimestamp, number | null];
export type Timeseries = TimeseriesPoint[];

/** A named series, e.g. one function's buckets from a top-k endpoint */
export interface NamedSeries {
  name: string;
  points: Timeseries;
}

export interface CronJobInfo {
  name: string;
  schedule: string;
  nextRunTs: number | null;
  lastRunStatus: "success" | "error" | null;
}

export interface ScheduledJobInfo {
  id: string;
  udfPath: string;
  nextTs: number | null;
  state: string;
}

export type DeploymentRunState =
  "running" | "paused" | "disabled" | "suspended" | "unknown";

/**
 * All health data fetched in one refresh cycle.
 * A `null` metric means "could not be fetched" — consumers must render this
 * as unavailable, never as zero/healthy. An empty array means "no traffic".
 */
export interface DeploymentHealth {
  callCountTopK: NamedSeries[] | null;
  failureTopK: NamedSeries[] | null;
  cacheHitTopK: NamedSeries[] | null;
  schedulerLag: Timeseries | null;
  concurrency: NamedSeries[] | null;
  crons: CronJobInfo[];
  scheduledJobs: ScheduledJobInfo[];
  totalDocuments: number | null;
  state: DeploymentRunState;
  windowMinutes: number;
}

/** Dashboard defaults: 1 hour window, 60 buckets, k=3 */
export const HEALTH_WINDOW_MINUTES = 60;
export const HEALTH_NUM_BUCKETS = 60;
export const HEALTH_TOP_K = 3;

function buildWindow(minutes: number, numBuckets: number): string {
  const end = Math.floor(Date.now() / 1000);
  const start = end - minutes * 60;
  return JSON.stringify({
    start: { secs_since_epoch: start, nanos_since_epoch: 0 },
    end: { secs_since_epoch: end, nanos_since_epoch: 0 },
    num_buckets: numBuckets,
  });
}

async function metricsGet<T>(
  auth: MetricsAuth,
  path: string,
  params: Record<string, string>,
): Promise<T> {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(
    `${auth.deploymentUrl}/api/app_metrics/${path}?${query}`,
    {
      headers: {
        Authorization: `Convex ${auth.token}`,
        "Convex-Client": CONVEX_CLIENT_ID,
      },
    },
  );
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Metrics request failed (${path}): ${response.status} ${body}`,
    );
  }
  return (await response.json()) as T;
}

/** Run a read-only system UDF via /api/query */
export async function systemQuery<T>(
  auth: MetricsAuth,
  path: string,
  args: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(`${auth.deploymentUrl}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Convex ${auth.token}`,
      "Convex-Client": CONVEX_CLIENT_ID,
    },
    body: JSON.stringify({ path, args, format: "json" }),
  });
  if (!response.ok) {
    throw new Error(`System query failed (${path}): ${response.status}`);
  }
  const data = (await response.json()) as {
    status?: string;
    value?: T;
    errorMessage?: string;
  };
  if (data.status === "error" || data.errorMessage) {
    throw new Error(data.errorMessage ?? `System query failed (${path})`);
  }
  return data.value as T;
}

function toNamedSeries(raw: [string, Timeseries][]): NamedSeries[] {
  return raw.map(([name, points]) => ({
    // Backend keys look like "users.js:viewer"; drop the .js for display
    name: name.replace(/\.js:/, ":"),
    points,
  }));
}

async function fetchTopK(
  auth: MetricsAuth,
  endpoint:
    | "function_call_count_top_k"
    | "failure_percentage_top_k"
    | "cache_hit_percentage_top_k",
  window: string,
): Promise<NamedSeries[]> {
  const raw = await metricsGet<[string, Timeseries][]>(auth, endpoint, {
    window,
    k: String(HEALTH_TOP_K),
  });
  return toNamedSeries(raw);
}

async function fetchConcurrency(
  auth: MetricsAuth,
  window: string,
): Promise<NamedSeries[]> {
  // Response is keyed "outstanding_functions:<env>:<UdfType>:<state>".
  // Aggregate to two series: running and queued.
  const raw = await metricsGet<Record<string, Timeseries>>(
    auth,
    "function_concurrency",
    { window },
  );
  const sums = new Map<string, (number | null)[]>();
  let timestamps: BackendTimestamp[] = [];
  for (const [key, points] of Object.entries(raw)) {
    const state = key.split(":").pop();
    if (state !== "running" && state !== "queued") continue;
    if (points.length > timestamps.length) {
      timestamps = points.map(([ts]) => ts);
    }
    const acc = sums.get(state) ?? [];
    points.forEach(([, value], i) => {
      if (value !== null) acc[i] = (acc[i] ?? 0) + value;
      else acc[i] = acc[i] ?? null;
    });
    sums.set(state, acc);
  }
  return ["running", "queued"]
    .filter((state) => sums.has(state))
    .map((state) => ({
      name: state,
      points: timestamps.map((ts, i): TimeseriesPoint => [
        ts,
        sums.get(state)![i] ?? null,
      ]),
    }));
}

async function fetchCrons(auth: MetricsAuth): Promise<CronJobInfo[]> {
  interface RawCron {
    name?: string;
    cronSpec?: { cronSchedule?: { type?: string; [key: string]: unknown } };
    nextRun?: { nextTs?: number } | null;
    lastRun?: { status?: { type?: string } } | null;
  }
  const raw = await systemQuery<RawCron[]>(
    auth,
    "_system/frontend/listCronJobs:default",
    {
      componentId: null,
    },
  );
  if (!Array.isArray(raw)) return [];
  return raw.map((cron) => ({
    name: cron.name ?? "unknown",
    schedule: cron.cronSpec?.cronSchedule?.type ?? "custom",
    nextRunTs: cron.nextRun?.nextTs ? Number(cron.nextRun.nextTs) : null,
    lastRunStatus:
      cron.lastRun?.status?.type === "success"
        ? "success"
        : cron.lastRun
          ? "error"
          : null,
  }));
}

async function fetchScheduledJobs(
  auth: MetricsAuth,
): Promise<ScheduledJobInfo[]> {
  interface RawScheduledJob {
    _id?: string;
    name?: string;
    udfPath?: string;
    nextTs?: number | null;
    state?: { kind?: string };
  }
  const result = await systemQuery<{ page?: RawScheduledJob[] }>(
    auth,
    "_system/frontend/paginatedScheduledJobs:default",
    { componentId: null, paginationOpts: { numItems: 25, cursor: null } },
  );
  const page = Array.isArray(result?.page) ? result.page : [];
  return page.map((job) => ({
    id: job._id ?? "",
    udfPath: job.udfPath ?? job.name ?? "unknown",
    nextTs: job.nextTs ? Number(job.nextTs) : null,
    state: job.state?.kind ?? "pending",
  }));
}

/** Resolve to null instead of rejecting, so one failing metric cannot
 * take down the whole refresh — and cannot masquerade as "healthy" */
async function orNull<T>(promise: Promise<T>): Promise<T | null> {
  try {
    return await promise;
  } catch (error) {
    console.error("Health metric fetch failed:", error);
    return null;
  }
}

/** Fetch everything the health view needs, tolerating partial failures */
export async function fetchDeploymentHealth(
  auth: MetricsAuth,
): Promise<DeploymentHealth> {
  const window = buildWindow(HEALTH_WINDOW_MINUTES, HEALTH_NUM_BUCKETS);

  const [
    callCountTopK,
    failureTopK,
    cacheHitTopK,
    schedulerLag,
    concurrency,
    crons,
    scheduledJobs,
    totalDocuments,
    state,
  ] = await Promise.all([
    orNull(fetchTopK(auth, "function_call_count_top_k", window)),
    orNull(fetchTopK(auth, "failure_percentage_top_k", window)),
    orNull(fetchTopK(auth, "cache_hit_percentage_top_k", window)),
    orNull(metricsGet<Timeseries>(auth, "scheduled_job_lag", { window })),
    orNull(fetchConcurrency(auth, window)),
    fetchCrons(auth).catch(() => [] as CronJobInfo[]),
    fetchScheduledJobs(auth).catch(() => [] as ScheduledJobInfo[]),
    systemQuery<number>(auth, "_system/frontend/tableSize:sizeOfAllTables", {
      componentId: null,
    }).catch(() => null),
    systemQuery<{ state?: string }>(
      auth,
      "_system/frontend/deploymentState:deploymentState",
      {},
    )
      .then((value): DeploymentRunState => {
        const state = value?.state;
        return state === "running" ||
          state === "paused" ||
          state === "disabled" ||
          state === "suspended"
          ? state
          : "unknown";
      })
      .catch((): DeploymentRunState => "unknown"),
  ]);

  // If every metric failed, the deployment is unreachable (bad auth, network,
  // deleted deployment) — surface that as an error instead of an empty view
  if (
    callCountTopK === null &&
    failureTopK === null &&
    cacheHitTopK === null &&
    schedulerLag === null &&
    concurrency === null
  ) {
    throw new Error("Could not load deployment health data");
  }

  return {
    callCountTopK,
    failureTopK,
    cacheHitTopK,
    schedulerLag,
    concurrency,
    crons,
    scheduledJobs,
    totalDocuments,
    state,
    windowMinutes: HEALTH_WINDOW_MINUTES,
  };
}

// ============================================================================
// Series helpers (shared by the health view and menu bar)
// ============================================================================

export function pointTimeMs(point: TimeseriesPoint): number {
  return point[0].secs_since_epoch * 1000;
}

/** Sum all values across a set of series (e.g. total calls in the window) */
export function sumSeries(series: NamedSeries[]): number {
  return series.reduce(
    (total, { points }) =>
      total + points.reduce((sum, [, value]) => sum + (value ?? 0), 0),
    0,
  );
}

/** Latest non-null value across the merged buckets of one series */
export function latestValue(points: Timeseries): number | null {
  for (let i = points.length - 1; i >= 0; i--) {
    const value = points[i][1];
    if (value !== null) return value;
  }
  return null;
}

/** Maximum value across all series, e.g. peak failure percentage */
export function maxValue(series: NamedSeries[]): number {
  let max = 0;
  for (const { points } of series) {
    for (const [, value] of points) {
      if (value !== null && value > max) max = value;
    }
  }
  return max;
}
