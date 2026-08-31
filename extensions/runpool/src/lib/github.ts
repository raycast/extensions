import { github, Pool, Status } from "./runpool";

const RUNS_PER_PAGE = 25;

type RawWorkflowRun = {
  id: number;
  name: string | null;
  event: string;
  status: string;
  conclusion: string | null;
  head_branch: string | null;
  head_sha: string;
  run_started_at: string | null;
  updated_at: string | null;
  created_at: string;
  html_url: string;
};

type WorkflowRunsResponse = {
  workflow_runs: RawWorkflowRun[];
};

type RawJob = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  runner_name: string | null;
  runner_group_name: string | null;
  labels: string[];
  started_at: string | null;
  completed_at: string | null;
  html_url: string;
};

type JobsResponse = {
  jobs: RawJob[];
};

type PullRequest = {
  number: number;
  html_url: string;
};

export type WorkflowRun = {
  key: string;
  id: number;
  repository: string;
  workflow: string;
  event: string;
  status: string;
  conclusion: string | null;
  branch: string | null;
  headSha: string;
  startedAt: string | null;
  updatedAt: string | null;
  createdAt: string;
  url: string;
  locations?: string[];
  pullRequests?: PullRequest[];
  jobs?: WorkflowJob[];
};

export type WorkflowJob = {
  id: number;
  name: string;
  status: string;
  conclusion: string | null;
  runnerName: string | null;
  runnerGroupName: string | null;
  labels: string[];
  startedAt: string | null;
  completedAt: string | null;
  url: string;
};

export type SourceFailure = {
  repository: string;
  message: string;
  /** The rejection itself, so a caller can tell a setup problem from a bad repo. */
  error: unknown;
};

type Source = {
  repository: string;
  nextPage: number;
  hasMore: boolean;
  runs: WorkflowRun[];
};

type SourceResult = {
  repository: string;
  runs: WorkflowRun[];
  hasMore: boolean;
};

/**
 * The repositories a RunPool installation can serve.
 *
 * An organisation pool has no repository-history endpoint, and its watch list
 * is the explicit list the user already chose for that pool. Reading status
 * locally avoids the unrelated runner-registration GitHub calls.
 */
export function configuredRepositories(status: Status): string[] {
  const repositories = new Set<string>();
  for (const pool of status.pools) {
    if (pool.scope === "repo") repositories.add(pool.target);
    else for (const repository of pool.watch) repositories.add(repository);
  }
  return [...repositories].sort();
}

function toWorkflowRun(repository: string, run: RawWorkflowRun): WorkflowRun {
  return {
    key: `${repository}/${run.id}`,
    id: run.id,
    repository,
    workflow: run.name ?? "Workflow run",
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    branch: run.head_branch,
    headSha: run.head_sha,
    startedAt: run.run_started_at,
    updatedAt: run.updated_at,
    createdAt: run.created_at,
    url: run.html_url,
  };
}

function newestFirst(left: WorkflowRun, right: WorkflowRun): number {
  const newest = Date.parse(right.createdAt) - Date.parse(left.createdAt);
  if (newest !== 0) return newest;
  return left.key.localeCompare(right.key);
}

async function fetchSourcePage(source: Source, signal?: AbortSignal): Promise<SourceResult> {
  const path = `repos/${source.repository}/actions/runs?per_page=${RUNS_PER_PAGE}&page=${source.nextPage}`;
  const output = await github(["api", path], signal);
  const response = JSON.parse(output) as WorkflowRunsResponse;
  const runs = response.workflow_runs.map((run) => toWorkflowRun(source.repository, run)).sort(newestFirst);
  return { repository: source.repository, runs, hasMore: runs.length === RUNS_PER_PAGE };
}

/**
 * Preserves global recency while GitHub only pages workflow runs per repository.
 *
 * It retains the unshown rows from every source before fetching another page,
 * so a busy repository cannot make older runs from another one jump the queue.
 */
export class WorkflowRunPager {
  private readonly sources: Source[];
  private failures: SourceFailure[] = [];
  private initialised = false;

  constructor(repositories: string[]) {
    this.sources = repositories.map((repository) => ({ repository, nextPage: 1, hasMore: true, runs: [] }));
  }

  async next(signal?: AbortSignal): Promise<{ runs: WorkflowRun[]; hasMore: boolean; failures: SourceFailure[] }> {
    const page: WorkflowRun[] = [];

    if (!this.initialised) {
      this.initialised = true;
      await this.fetchPages(this.sources, signal);
    }

    while (page.length < RUNS_PER_PAGE) {
      // The first run on a new repository page can outrank every queued run
      // elsewhere. Refill before choosing the next global row, never after.
      await this.fetchPages(
        this.sources.filter((source) => source.runs.length === 0 && source.hasMore),
        signal,
      );

      const available = this.sources.filter((source) => source.runs.length > 0);
      if (available.length === 0) break;
      available.sort((left, right) => newestFirst(left.runs[0], right.runs[0]));
      page.push(available[0].runs.shift()!);
    }

    return {
      runs: page,
      hasMore: this.sources.some((source) => source.runs.length > 0 || source.hasMore),
      failures: this.failures,
    };
  }

  private async fetchPages(sources: Source[], signal?: AbortSignal) {
    if (sources.length === 0) return;

    const results = await Promise.allSettled(sources.map((source) => fetchSourcePage(source, signal)));
    for (let index = 0; index < results.length; index += 1) {
      const source = sources[index];
      const result = results[index];
      if (result.status === "fulfilled") {
        source.nextPage += 1;
        source.hasMore = result.value.hasMore;
        source.runs.push(...result.value.runs);
        continue;
      }

      source.hasMore = false;
      this.failures.push({
        repository: source.repository,
        message: errorText(result.reason),
        error: result.reason,
      });
    }
  }
}

function errorText(error: unknown): string {
  const stderr = (error as { stderr?: string } | null)?.stderr?.trim();
  return stderr || (error instanceof Error ? error.message : String(error));
}

function toWorkflowJob(job: RawJob): WorkflowJob {
  return {
    id: job.id,
    name: job.name,
    status: job.status,
    conclusion: job.conclusion,
    runnerName: job.runner_name,
    runnerGroupName: job.runner_group_name,
    labels: job.labels ?? [],
    startedAt: job.started_at,
    completedAt: job.completed_at,
    url: job.html_url,
  };
}

export async function workflowRunJobs(run: WorkflowRun, signal?: AbortSignal): Promise<WorkflowJob[]> {
  const output = await github(
    ["api", `repos/${run.repository}/actions/runs/${run.id}/jobs?per_page=100`, "--paginate", "--slurp"],
    signal,
  );
  return (JSON.parse(output) as JobsResponse[]).flatMap((page) => page.jobs.map(toWorkflowJob));
}

async function fetchPullRequests(run: WorkflowRun, signal?: AbortSignal): Promise<PullRequest[]> {
  if (run.event !== "pull_request") return [];
  const output = await github(["api", `repos/${run.repository}/commits/${run.headSha}/pulls`], signal);
  return JSON.parse(output) as PullRequest[];
}

function runpoolHost(runnerName: string, pools: Pool[]): string | undefined {
  for (const pool of pools) {
    const suffix = new RegExp(`-${escapeRegExp(pool.name)}-\\d+$`);
    if (suffix.test(runnerName)) return runnerName.replace(suffix, "");
  }
  return undefined;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function jobLocation(job: WorkflowJob, pools: Pool[]): string | undefined {
  if (!job.runnerName || job.status === "skipped") return undefined;

  if (job.runnerGroupName?.toLowerCase().startsWith("blacksmith runners") || job.runnerName.startsWith("blacksmith-")) {
    return "Blacksmith";
  }
  if (job.runnerName.startsWith("GitHub Actions") || job.labels.some((label) => label.endsWith("-latest"))) {
    return "GitHub";
  }
  return runpoolHost(job.runnerName, pools) ?? job.runnerName;
}

export function runnerLocations(jobs: WorkflowJob[], pools: Pool[]): string[] {
  const locations = new Set<string>();

  for (const job of jobs) {
    const location = jobLocation(job, pools);
    if (location) locations.add(location);
  }

  return [...locations].sort((left, right) => left.localeCompare(right));
}

export async function enrichWorkflowRun(run: WorkflowRun, pools: Pool[], signal?: AbortSignal): Promise<WorkflowRun> {
  const [jobs, pullRequests] = await Promise.allSettled([workflowRunJobs(run, signal), fetchPullRequests(run, signal)]);
  return {
    ...run,
    ...(jobs.status === "fulfilled" ? { jobs: jobs.value, locations: runnerLocations(jobs.value, pools) } : {}),
    ...(pullRequests.status === "fulfilled" ? { pullRequests: pullRequests.value } : {}),
  };
}

/** Only a handful of per-run requests should be in flight at once. */
export async function enrichWorkflowRuns(
  runs: WorkflowRun[],
  pools: Pool[],
  signal?: AbortSignal,
  concurrency = 4,
): Promise<WorkflowRun[]> {
  const enriched: WorkflowRun[] = [];
  let next = 0;

  async function worker() {
    while (next < runs.length) {
      const index = next;
      next += 1;
      enriched[index] = await enrichWorkflowRun(runs[index], pools, signal);
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, runs.length) }, worker));
  return enriched;
}

export function runDuration(run: WorkflowRun, now = Date.now()): string | undefined {
  return duration(run.startedAt, run.status === "completed" ? run.updatedAt : new Date(now).toISOString());
}

export function jobDuration(job: WorkflowJob): string | undefined {
  return duration(job.startedAt, job.completedAt);
}

function duration(startedAt: string | null, endedAt: string | null): string | undefined {
  if (!startedAt || !endedAt) return undefined;
  const started = Date.parse(startedAt);
  const ended = Date.parse(endedAt);
  if (Number.isNaN(started) || Number.isNaN(ended)) return undefined;
  const seconds = Math.max(0, Math.floor((ended - started) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${remainder}s`;
  return `${remainder}s`;
}

export function runSubtitle(run: WorkflowRun): string {
  if (run.pullRequests?.length) {
    return run.pullRequests.map((pullRequest) => `PR #${pullRequest.number}`).join(", ");
  }
  return [run.branch, run.event].filter((value): value is string => Boolean(value)).join(", ");
}

export function runStatus(run: WorkflowRun): string {
  return (run.status === "completed" ? (run.conclusion ?? "Completed") : run.status).replaceAll("_", " ");
}

export function jobStatus(job: WorkflowJob): string {
  return (job.status === "completed" ? (job.conclusion ?? "Completed") : job.status).replaceAll("_", " ");
}
