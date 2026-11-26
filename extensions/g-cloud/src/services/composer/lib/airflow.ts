// Airflow 2.x stable REST API client (/api/v1). READ-ONLY by design: the only POSTs are the batch
// query endpoints /dags/~/dagRuns/list and /dags/~/dagRuns/~/taskInstances/list, which are reads.
// Pure (no @raycast/api), token supplied by a TokenProvider.

import { TokenProvider } from "./gcloud";
import { mapLimit } from "./composer";
import { qs, requestJson, requestText, seg } from "./http";
import {
  ApiError,
  Dag,
  Dataset,
  DatasetEvent,
  QueuedEvent,
  TaskInstancesBatchQuery,
  DagDetails,
  DagRun,
  DagRunsBatchQuery,
  HealthStatus,
  ImportError,
  TaskInstance,
  TaskLog,
  XComEntry,
} from "./types";

const PAGE = 100; // GET endpoints: Airflow's default maximum_page_limit
/** POST batch endpoints (dagRuns/list, taskInstances/list) accept up to 1000 items per page. */
const BATCH_PAGE = 1000;

export interface ListDagsOptions {
  /** Substring match on dag_id (Airflow `dag_id_pattern`). */
  pattern?: string;
  onlyActive?: boolean;
  paused?: boolean;
  tags?: string[];
  /** Stop after this many DAGs (default: all). */
  max?: number;
  signal?: AbortSignal;
}

export interface ListRunsOptions {
  limit?: number;
  offset?: number;
  states?: string[];
  orderBy?: string; // e.g. "-execution_date", "-start_date"
  startDateGte?: string;
  signal?: AbortSignal;
}

export class AirflowClient {
  readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly tokens: TokenProvider,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private api(path: string): string {
    return `${this.baseUrl}/api/v1${path}`;
  }

  private get<T>(path: string, signal?: AbortSignal, timeoutMs?: number): Promise<T> {
    return requestJson<T>(this.tokens, this.api(path), { signal, timeoutMs });
  }

  // ---- health -------------------------------------------------------------------------------

  health(signal?: AbortSignal): Promise<HealthStatus> {
    return this.get<HealthStatus>("/health", signal, 15_000);
  }

  // ---- DAGs ---------------------------------------------------------------------------------

  async listDags(opts: ListDagsOptions = {}): Promise<{ dags: Dag[]; total: number }> {
    const dags: Dag[] = [];
    let total = 0;
    let offset = 0;
    const max = opts.max ?? Number.POSITIVE_INFINITY;
    for (;;) {
      const page = await this.get<{ dags: Dag[]; total_entries: number }>(
        `/dags${qs({
          limit: PAGE,
          offset,
          order_by: "dag_id",
          only_active: opts.onlyActive ?? true,
          paused: opts.paused,
          dag_id_pattern: opts.pattern || undefined,
          tags: opts.tags,
        })}`,
        opts.signal,
      );
      total = page.total_entries;
      dags.push(...page.dags);
      offset += page.dags.length;
      if (page.dags.length === 0 || offset >= total || dags.length >= max) break;
    }
    return { dags: dags.slice(0, Number.isFinite(max) ? max : undefined), total };
  }

  getDag(dagId: string, signal?: AbortSignal): Promise<Dag> {
    return this.get<Dag>(`/dags/${seg(dagId)}`, signal);
  }

  getDagDetails(dagId: string, signal?: AbortSignal): Promise<DagDetails> {
    return this.get<DagDetails>(`/dags/${seg(dagId)}/details`, signal);
  }

  /** DAG source code, via the file_token from the DAG object. */
  async getDagSource(fileToken: string, signal?: AbortSignal): Promise<string> {
    const { text } = await requestText(this.tokens, this.api(`/dagSources/${seg(fileToken)}`), {
      accept: "text/plain",
      signal,
    });
    return text;
  }

  // ---- DAG runs -----------------------------------------------------------------------------

  /**
   * Runs of one DAG. GET silently caps at 100 per request (limit=200 returns 100), so larger
   * limits are fetched in pages of 100 from `offset`.
   */
  async listDagRuns(dagId: string, opts: ListRunsOptions = {}): Promise<{ runs: DagRun[]; total: number }> {
    const want = opts.limit ?? 25;
    const runs: DagRun[] = [];
    let total = 0;
    let offset = opts.offset ?? 0;
    while (runs.length < want) {
      const page = await this.get<{ dag_runs: DagRun[]; total_entries: number }>(
        `/dags/${seg(dagId)}/dagRuns${qs({
          limit: Math.min(PAGE, want - runs.length),
          offset: offset || undefined,
          order_by: opts.orderBy ?? "-execution_date",
          state: opts.states,
          start_date_gte: opts.startDateGte,
        })}`,
        opts.signal,
      );
      total = page.total_entries;
      runs.push(...page.dag_runs);
      offset += page.dag_runs.length;
      if (page.dag_runs.length === 0 || offset >= total) break;
    }
    return { runs, total };
  }

  getDagRun(dagId: string, runId: string, signal?: AbortSignal): Promise<DagRun> {
    return this.get<DagRun>(`/dags/${seg(dagId)}/dagRuns/${seg(runId)}`, signal);
  }

  /**
   * Cross-DAG run query: POST /dags/~/dagRuns/list. Pages until `max` runs or exhaustion.
   * This is a READ despite the POST verb.
   */
  async queryDagRuns(
    query: DagRunsBatchQuery,
    opts: { max?: number; signal?: AbortSignal } = {},
  ): Promise<{ runs: DagRun[]; total: number }> {
    const runs: DagRun[] = [];
    let total = 0;
    let offset = query.page_offset ?? 0;
    const max = opts.max ?? 500;
    for (;;) {
      const page = await requestJson<{ dag_runs: DagRun[]; total_entries: number }>(
        this.tokens,
        this.api("/dags/~/dagRuns/list"),
        {
          method: "POST",
          body: {
            order_by: "-start_date",
            ...query,
            page_limit: Math.min(BATCH_PAGE, max - runs.length),
            page_offset: offset,
          },
          signal: opts.signal,
        },
      );
      total = page.total_entries;
      runs.push(...page.dag_runs);
      offset += page.dag_runs.length;
      if (page.dag_runs.length === 0 || offset >= total || runs.length >= max) break;
    }
    return { runs: runs.slice(0, max), total };
  }

  /**
   * Latest run for each DAG id (by execution date): one limit=1 request per DAG with bounded
   * concurrency. Measured on a 170-DAG environment: a batched dagRuns/list over recent runs
   * is slower (~0.8 s per 100-run page and misses rarely-run DAGs), so this is the faster path.
   * Callers should load it lazily after the DAG list renders. DAGs that never ran are absent;
   * per-DAG failures are skipped except auth errors.
   */
  async latestRuns(
    dagIds: string[],
    opts: {
      concurrency?: number;
      signal?: AbortSignal;
      onProgress?: (done: number, total: number, partial: Map<string, DagRun>) => void;
    } = {},
  ) {
    const map = new Map<string, DagRun>();
    let done = 0;
    await mapLimit(dagIds, opts.concurrency ?? 20, async (dagId) => {
      try {
        const { runs } = await this.listDagRuns(dagId, { limit: 1, orderBy: "-execution_date", signal: opts.signal });
        if (runs[0]) map.set(dagId, runs[0]);
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) throw e;
      } finally {
        opts.onProgress?.(++done, dagIds.length, map);
      }
    });
    return map;
  }

  // ---- task instances -----------------------------------------------------------------------

  async listTaskInstances(
    dagId: string,
    runId: string,
    opts: { states?: string[]; signal?: AbortSignal } = {},
  ): Promise<TaskInstance[]> {
    const out: TaskInstance[] = [];
    let offset = 0;
    for (;;) {
      const page = await this.get<{ task_instances: TaskInstance[]; total_entries: number }>(
        `/dags/${seg(dagId)}/dagRuns/${seg(runId)}/taskInstances${qs({ limit: PAGE, offset, state: opts.states })}`,
        opts.signal,
      );
      out.push(...page.task_instances);
      offset += page.task_instances.length;
      if (page.task_instances.length === 0 || offset >= page.total_entries) break;
    }
    return out;
  }

  /** Expanded instances of a dynamically mapped task (map_index 0..n). */
  async listMappedTaskInstances(
    dagId: string,
    runId: string,
    taskId: string,
    opts: { signal?: AbortSignal } = {},
  ): Promise<TaskInstance[]> {
    const out: TaskInstance[] = [];
    let offset = 0;
    for (;;) {
      const page = await this.get<{ task_instances: TaskInstance[]; total_entries: number }>(
        // order_by=map_index is rejected (400) on Airflow 2.10/2.11; sort client-side instead.
        `/dags/${seg(dagId)}/dagRuns/${seg(runId)}/taskInstances/${seg(taskId)}/listMapped${qs({
          limit: PAGE,
          offset,
        })}`,
        opts.signal,
      );
      out.push(...page.task_instances);
      offset += page.task_instances.length;
      if (page.task_instances.length === 0 || offset >= page.total_entries) break;
    }
    return out.sort((a, b) => a.map_index - b.map_index);
  }

  /**
   * Task log for one try. Requests text/plain, which streams the full log. Falls back to the
   * JSON shape ({content, continuation_token}) if the server ignores the Accept header.
   */
  async getTaskLog(
    dagId: string,
    runId: string,
    taskId: string,
    tryNumber: number,
    opts: { mapIndex?: number; signal?: AbortSignal } = {},
  ): Promise<TaskLog> {
    const mapIndex = opts.mapIndex !== undefined && opts.mapIndex >= 0 ? opts.mapIndex : undefined;
    const url = this.api(
      `/dags/${seg(dagId)}/dagRuns/${seg(runId)}/taskInstances/${seg(taskId)}/logs/${tryNumber}${qs({
        full_content: true,
        map_index: mapIndex,
      })}`,
    );
    const { text, contentType } = await requestText(this.tokens, url, {
      accept: "text/plain",
      signal: opts.signal,
      timeoutMs: 90_000,
    });
    if (contentType.includes("application/json")) {
      try {
        const j = JSON.parse(text) as { content?: string; continuation_token?: string };
        return { content: normalizeLogContent(j.content ?? ""), continuationToken: j.continuation_token };
      } catch {
        // fall through to raw text
      }
    }
    return { content: normalizeLogContent(text) };
  }

  // ---- XCom ---------------------------------------------------------------------------------

  async listXComKeys(
    dagId: string,
    runId: string,
    taskId: string,
    opts: { mapIndex?: number; signal?: AbortSignal } = {},
  ): Promise<XComEntry[]> {
    const page = await this.get<{ xcom_entries: XComEntry[] }>(
      `/dags/${seg(dagId)}/dagRuns/${seg(runId)}/taskInstances/${seg(taskId)}/xcomEntries${qs({
        limit: PAGE,
        map_index: opts.mapIndex !== undefined && opts.mapIndex >= 0 ? opts.mapIndex : undefined,
      })}`,
      opts.signal,
    );
    return page.xcom_entries;
  }

  /** The list endpoint returns value: null - fetch each key by name to get its value. */
  getXCom(
    dagId: string,
    runId: string,
    taskId: string,
    key: string,
    opts: { mapIndex?: number; signal?: AbortSignal } = {},
  ): Promise<XComEntry> {
    return this.get<XComEntry>(
      `/dags/${seg(dagId)}/dagRuns/${seg(runId)}/taskInstances/${seg(taskId)}/xcomEntries/${seg(key)}${qs({
        // deserialize=true is disabled on these Composer envs (400); values come back stringified.
        map_index: opts.mapIndex !== undefined && opts.mapIndex >= 0 ? opts.mapIndex : undefined,
      })}`,
      opts.signal,
    );
  }

  /**
   * Cross-DAG task-instance query: POST /dags/~/dagRuns/~/taskInstances/list (a READ).
   * Pages at 1000 until `max`. onProgress reports rows fetched / total.
   */
  async queryTaskInstances(
    query: TaskInstancesBatchQuery,
    opts: { max?: number; signal?: AbortSignal; onProgress?: (got: number, total: number) => void } = {},
  ): Promise<{ tis: TaskInstance[]; total: number }> {
    const tis: TaskInstance[] = [];
    let total = 0;
    let offset = 0;
    const max = opts.max ?? 5000;
    for (;;) {
      const page = await requestJson<{ task_instances: TaskInstance[]; total_entries: number }>(
        this.tokens,
        this.api("/dags/~/dagRuns/~/taskInstances/list"),
        {
          method: "POST",
          body: { ...query, page_limit: Math.min(BATCH_PAGE, max - tis.length), page_offset: offset },
          signal: opts.signal,
          timeoutMs: 90_000,
        },
      );
      total = page.total_entries;
      tis.push(...page.task_instances);
      offset += page.task_instances.length;
      opts.onProgress?.(tis.length, total);
      if (page.task_instances.length === 0 || offset >= total || tis.length >= max) break;
    }
    return { tis, total };
  }

  // ---- datasets ------------------------------------------------------------------------------

  /** Every dataset with producing_tasks / consuming_dags (GET is capped at 100 per page). */
  async listDatasets(signal?: AbortSignal): Promise<Dataset[]> {
    const out: Dataset[] = [];
    let offset = 0;
    for (;;) {
      const page = await this.get<{ datasets: Dataset[]; total_entries: number }>(
        `/datasets${qs({ limit: PAGE, offset })}`,
        signal,
      );
      out.push(...page.datasets);
      offset += page.datasets.length;
      if (page.datasets.length === 0 || offset >= page.total_entries) break;
    }
    return out;
  }

  /** Dataset events, always filtered (busy environments can have 100k+ events). */
  async datasetEvents(
    filter: { datasetId?: number; sourceDagId?: string; sourceRunId?: string; limit?: number },
    signal?: AbortSignal,
  ): Promise<{ events: DatasetEvent[]; total: number }> {
    const page = await this.get<{ dataset_events: DatasetEvent[]; total_entries: number }>(
      `/datasets/events${qs({
        limit: filter.limit ?? 25,
        order_by: "-timestamp",
        dataset_id: filter.datasetId,
        source_dag_id: filter.sourceDagId,
        source_run_id: filter.sourceRunId,
      })}`,
      signal,
    );
    return { events: page.dataset_events, total: page.total_entries };
  }

  /** Dataset events that triggered a (dataset-scheduled) run. */
  async upstreamDatasetEvents(dagId: string, runId: string, signal?: AbortSignal): Promise<DatasetEvent[]> {
    const page = await this.get<{ dataset_events: DatasetEvent[] }>(
      `/dags/${seg(dagId)}/dagRuns/${seg(runId)}/upstreamDatasetEvents`,
      signal,
    );
    return page.dataset_events;
  }

  /** Upstream signals already queued for this DAG's next run. 404 = nothing queued. */
  async queuedEvents(dagId: string, signal?: AbortSignal): Promise<QueuedEvent[]> {
    try {
      const page = await this.get<{ queued_events: QueuedEvent[] }>(`/dags/${seg(dagId)}/datasets/queuedEvent`, signal);
      return page.queued_events ?? [];
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) return [];
      throw e;
    }
  }

  // ---- import errors ------------------------------------------------------------------------

  async listImportErrors(signal?: AbortSignal): Promise<ImportError[]> {
    const out: ImportError[] = [];
    let offset = 0;
    for (;;) {
      const page = await this.get<{ import_errors: ImportError[]; total_entries: number }>(
        `/importErrors${qs({ limit: PAGE, offset })}`,
        signal,
      );
      out.push(...page.import_errors);
      offset += page.import_errors.length;
      if (page.import_errors.length === 0 || offset >= page.total_entries) break;
    }
    return out;
  }

  // ---- web UI deep links --------------------------------------------------------------------

  uiDagUrl(dagId: string): string {
    return `${this.baseUrl}/dags/${seg(dagId)}/grid`;
  }

  uiRunUrl(dagId: string, runId: string): string {
    return `${this.baseUrl}/dags/${seg(dagId)}/grid${qs({ dag_run_id: runId })}`;
  }

  uiTaskUrl(dagId: string, runId: string, taskId: string, mapIndex?: number): string {
    return `${this.baseUrl}/dags/${seg(dagId)}/grid${qs({
      dag_run_id: runId,
      task_id: taskId,
      map_index: mapIndex !== undefined && mapIndex >= 0 ? mapIndex : undefined,
      tab: "logs",
    })}`;
  }

  uiImportErrorsUrl(): string {
    return `${this.baseUrl}/home`;
  }
}

/**
 * Some Airflow builds return the log as a Python repr of [(host, text)] tuples with escaped
 * newlines. Unwrap that into plain text; leave ordinary text untouched.
 */
export function normalizeLogContent(raw: string): string {
  const s = raw.trim();
  if (!(s.startsWith("[(") || s.startsWith("(("))) return raw;
  const chunks: string[] = [];
  const re = /\(\s*'((?:[^'\\]|\\.)*)'\s*,\s*'((?:[^'\\]|\\.)*)'\s*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    chunks.push(
      m[2].replace(/\\n/g, "\n").replace(/\\t/g, "\t").replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, "\\"),
    );
  }
  return chunks.length ? chunks.join("\n") : raw;
}

/** Keep the last `lines` lines of a log; returns the tail and how many lines were dropped. */
export function tailLines(text: string, lines: number): { text: string; dropped: number } {
  const all = text.split("\n");
  if (all.length <= lines) return { text, dropped: 0 };
  return { text: all.slice(-lines).join("\n"), dropped: all.length - lines };
}

/** Lines that look like errors, for a quick "what went wrong" summary. */
export function errorLines(text: string, max = 30): string[] {
  const re = /(ERROR|CRITICAL|Traceback|Exception|Error:|FAILED|failed with|Failure in)/;
  return text
    .split("\n")
    .filter((l) => re.test(l))
    .slice(-max);
}

/**
 * XCom values come back as Python-repr strings when deserialize is disabled, e.g.
 * "{'project_id': 'p', 'region': 'us-central1', 'execution_name': 'x-abc'}". Extract flat
 * string/number fields. Also accepts real objects and JSON strings.
 */
export function parseReprDict(value: unknown): Record<string, string> {
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, String(v)]));
  }
  if (typeof value !== "string") return {};
  try {
    const j = JSON.parse(value);
    if (j && typeof j === "object") return parseReprDict(j);
  } catch {
    // not JSON - try Python repr
  }
  const out: Record<string, string> = {};
  const re = /['"]([\w.-]+)['"]\s*:\s*(?:'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|(-?[\d.]+|True|False|None))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value))) out[m[1]] = m[2] ?? m[3] ?? m[4] ?? "";
  return out;
}

export interface CloudRunExecution {
  projectId: string;
  region: string;
  jobName?: string;
  executionName: string;
  startTimestamp?: string;
  consoleUrl: string;
  logsUrl: string;
}

/**
 * Turn the `cloud_run_job_logging_link` XCom value into Cloud Run + Cloud Logging links. When the
 * value has no region, `fallbackRegion` (normally the Composer environment's location) is used.
 */
export function cloudRunExecutionFromXCom(value: unknown, fallbackRegion?: string): CloudRunExecution | undefined {
  const d = parseReprDict(value);
  const region = d.region || fallbackRegion;
  if (!d.execution_name || !d.project_id || !region) return undefined;
  const query = `resource.type="cloud_run_job"\nlabels."run.googleapis.com/execution_name"="${d.execution_name}"`;
  return {
    projectId: d.project_id,
    region,
    jobName: d.job_name,
    executionName: d.execution_name,
    startTimestamp: d.start_timestamp,
    consoleUrl: `https://console.cloud.google.com/run/jobs/executions/details/${region}/${d.execution_name}/tasks?project=${d.project_id}`,
    logsUrl: `https://console.cloud.google.com/logs/query;query=${encodeURIComponent(query)}?project=${d.project_id}`,
  };
}

/** XCom keys known to carry links worth surfacing in the UI. */
export const LINK_XCOM_KEYS = ["cloud_run_job_logging_link", "log_uri", "job_run_url"];
