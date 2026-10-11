import { Cache, getPreferenceValues, LocalStorage } from "@raycast/api";
import { useCachedPromise, useLocalStorage } from "@raycast/utils";
import { demoAnnotations, demoChoices, DEMO_REPO, DEMO_REQUIRED_CHECKS, demoJob, demoLog, demoQueue } from "./lib/demo";
import { findGh, GhError, GhErrorKind, RepoConfig, repoSlug } from "./lib/gh";
import {
  Annotation,
  fetchAnnotations,
  fetchJob,
  fetchJobLog,
  filesInRepo,
  findPassingJob,
  Job,
  rerunFailedJobs,
  rerunJob,
} from "./lib/jobs";
import { LogSummary, logFingerprints, StepRef, summarizeLog } from "./lib/logs";
import { fetchQueue, fetchRequiredChecks, parseQueue, QueueSnapshot } from "./lib/queue";
import { fetchRepoChoices, rememberRecent, RepoChoice, RepoSelection, RepoSort, searchRepoChoices } from "./lib/repos";

export type MergeQueueLaunchContext = {
  demoError?: GhErrorKind;
  prNumber?: number;
  check?: string;
  view?: "checks" | "job" | "repositories";
  demo?: boolean;
};

type CachedRequiredChecks = { fetchedAt: number; checks: string[] };
type CachedPassingRun = { fetchedAt: number; fingerprints: string[] | null };

export type LogJob = Pick<Job, "id" | "runId" | "name" | "workflowName" | "headSha">;

const SELECTION_KEY = "repository";
const RECENTS_KEY = "recent-repositories";
const DEMO_RECENTS: RepoSelection[] = [DEMO_REPO, { owner: "acme", name: "payments", branch: "main" }];
const REQUIRED_CHECKS_TTL_MS = 60 * 60 * 1000;
const PASSING_RUN_TTL_MS = 6 * 60 * 60 * 1000;
const NO_PASSING_RUN_TTL_MS = 60 * 60 * 1000;
const PASSING_RUN_TIMEOUT_MS = 20_000;
const LOGS_KEPT_IN_MEMORY = 4;
const logDownloads = new Map<number, Promise<string>>();
const cache = new Cache();

let demo = false;
let demoError: GhErrorKind | undefined;

export function enableDemo(enabled: boolean | undefined, error?: GhErrorKind) {
  demo = demo || Boolean(enabled);
  demoError = demoError ?? error;
}

export function isDemo(): boolean {
  return demo;
}

function ghConfig(): Pick<RepoConfig, "ghPath"> {
  const preferred = getPreferenceValues<Preferences>().ghPath?.trim() || undefined;
  return { ghPath: findGh(preferred) ?? preferred ?? "/opt/homebrew/bin/gh" };
}

function toConfig(selection: RepoSelection): RepoConfig {
  return { ...ghConfig(), owner: selection.owner, name: selection.name, branch: selection.branch };
}

async function storedSelection(): Promise<RepoSelection | undefined> {
  const raw = await LocalStorage.getItem<string>(SELECTION_KEY);
  return raw ? (JSON.parse(raw) as RepoSelection) : undefined;
}

export async function getConfig(): Promise<RepoConfig> {
  const selection = demo ? DEMO_REPO : await storedSelection();
  if (!selection) {
    throw new GhError("Choose a repository first");
  }
  return toConfig(selection);
}

export function useSelection() {
  const stored = useLocalStorage<RepoSelection>(SELECTION_KEY);
  const recents = useLocalStorage<RepoSelection[]>(RECENTS_KEY, []);
  const setSelection = async (selection: RepoSelection) => {
    if (demo) {
      return;
    }
    await stored.setValue(selection);
    await recents.setValue(rememberRecent(recents.value ?? [], selection));
  };
  return {
    selection: demo ? DEMO_REPO : stored.value,
    recents: demo ? DEMO_RECENTS : (recents.value ?? []),
    setSelection,
    isLoading: stored.isLoading && !demo,
  };
}

export function selectionFor(choice: RepoChoice, branch?: string): RepoSelection {
  return { owner: choice.owner, name: choice.name, branch: branch ?? choice.queueBranch };
}

async function requiredChecks(config: RepoConfig, branch: string): Promise<string[]> {
  const key = `required-checks:${repoSlug(config)}:${branch}`;
  const raw = cache.get(key);
  const cached = raw ? (JSON.parse(raw) as CachedRequiredChecks) : undefined;
  if (cached && Date.now() - cached.fetchedAt < REQUIRED_CHECKS_TTL_MS) {
    return cached.checks;
  }
  try {
    const checks = await fetchRequiredChecks(config, branch);
    cache.set(key, JSON.stringify({ fetchedAt: Date.now(), checks } satisfies CachedRequiredChecks));
    return checks;
  } catch {
    return cached?.checks ?? [];
  }
}

async function loadQueue(useDemo: boolean, owner: string, name: string, branch?: string): Promise<QueueSnapshot> {
  if (useDemo && demoError) {
    throw new GhError(`Demo ${demoError} error`, demoError, { repo: "acme/storefront", branch: "main" });
  }
  if (useDemo) {
    return parseQueue(DEMO_REPO, demoQueue(), DEMO_REQUIRED_CHECKS);
  }
  const config = toConfig({ owner, name, branch });
  return fetchQueue(config, (resolved) => requiredChecks(config, resolved));
}

export function useMergeQueue(selection: RepoSelection | undefined) {
  return useCachedPromise(loadQueue, [demo, selection?.owner ?? "", selection?.name ?? "", selection?.branch], {
    keepPreviousData: true,
    execute: Boolean(selection),
  });
}

async function loadChoices(useDemo: boolean): Promise<RepoChoice[]> {
  return useDemo ? demoChoices() : fetchRepoChoices(ghConfig());
}

async function loadSearch(useDemo: boolean, text: string, sort: RepoSort): Promise<RepoChoice[]> {
  if (useDemo) {
    return demoChoices().filter((choice) => choice.slug.includes(text.trim().toLowerCase()));
  }
  return searchRepoChoices(ghConfig(), text, sort);
}

export function useRepoChoices(options: { execute?: boolean } = {}) {
  return useCachedPromise(loadChoices, [demo], { keepPreviousData: true, execute: options.execute ?? true });
}

export function useRepoSearch(text: string, sort: RepoSort) {
  return useCachedPromise(loadSearch, [demo, text, sort], {
    keepPreviousData: true,
    execute: text.trim().length >= 2,
  });
}

export async function loadJob(jobId: number) {
  if (demo) {
    return { job: demoJob(jobId), annotations: demoAnnotations(jobId) };
  }
  const config = await getConfig();
  const [job, annotations] = await Promise.all([
    fetchJob(config, jobId),
    fetchAnnotations(config, jobId).catch((): Annotation[] => []),
  ]);
  return { job, annotations };
}

async function passingFingerprints(config: RepoConfig, job: LogJob): Promise<Set<string> | undefined> {
  const key = `passing-run:${repoSlug(config)}:${job.workflowName ?? job.runId}:${job.name}`;
  const raw = cache.get(key);
  const cached = raw ? (JSON.parse(raw) as CachedPassingRun) : undefined;
  const ttl = cached?.fingerprints ? PASSING_RUN_TTL_MS : NO_PASSING_RUN_TTL_MS;
  if (cached && Date.now() - cached.fetchedAt < ttl) {
    return cached.fingerprints ? new Set(cached.fingerprints) : undefined;
  }
  const passing = await findPassingJob(config, job);
  const fingerprints = passing ? logFingerprints(await fetchJobLog(config, passing.jobId)) : null;
  cache.set(key, JSON.stringify({ fetchedAt: Date.now(), fingerprints } satisfies CachedPassingRun));
  return fingerprints ? new Set(fingerprints) : undefined;
}

function withinTimeout<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([promise, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))]);
}

async function markFilesInRepo(config: RepoConfig, sha: string | undefined, summary: LogSummary): Promise<LogSummary> {
  const paths = summary.errors.flatMap((error) => (error.path ? [error.path] : []));
  if (!sha || paths.length === 0) {
    return summary;
  }
  const existing = await filesInRepo(config, sha, paths).catch(() => new Set<string>());
  return {
    ...summary,
    errors: summary.errors.map((error) => ({ ...error, inRepo: Boolean(error.path && existing.has(error.path)) })),
  };
}

function downloadLog(config: RepoConfig, jobId: number): Promise<string> {
  const existing = logDownloads.get(jobId);
  if (existing) {
    return existing;
  }
  const download = fetchJobLog(config, jobId);
  download.catch(() => logDownloads.delete(jobId));
  logDownloads.set(jobId, download);
  while (logDownloads.size > LOGS_KEPT_IN_MEMORY) {
    logDownloads.delete(logDownloads.keys().next().value!);
  }
  return download;
}

export async function loadLogSummary(job: LogJob, step: StepRef | undefined, compare: boolean): Promise<LogSummary> {
  if (demo) {
    return summarizeLog(demoLog(job.id), { step });
  }
  const config = await getConfig();
  const [raw, passing] = await Promise.all([
    downloadLog(config, job.id),
    compare
      ? withinTimeout(passingFingerprints(config, job), PASSING_RUN_TIMEOUT_MS).catch(() => undefined)
      : undefined,
  ]);
  return markFilesInRepo(config, job.headSha, summarizeLog(raw, { step, passing }));
}

export async function requestRerunFailed(runIds: number[]) {
  if (demo) {
    return;
  }
  const config = await getConfig();
  for (const runId of runIds) {
    await rerunFailedJobs(config, runId);
  }
}

export async function requestRerunJob(jobId: number) {
  if (!demo) {
    await rerunJob(await getConfig(), jobId);
  }
}
