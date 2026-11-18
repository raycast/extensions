import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { logger } from "@chrismessina/raycast-logger";
import { DayOneCliError, lastErrorLine } from "./cli";
import { listJournals, runDoctor } from "./api";
import { detachedJob, mtime, RunRecord, safeRead } from "./jobs";
import { parseSyncProgress, SyncProgress } from "./parse";

const log = logger.child("[sync]");

// A first sync of a large account takes minutes, longer than Raycast keeps a command alive. So the CLI runs
// detached and writes to files in supportPath/sync; any command (or a later launch) can attach to it and read
// progress. The files hold the CLI's progress lines and its JSON summary: journal IDs and counts, no entry text.
/** Long enough for a first sync of a large account; the CLI's own lock also prevents overlap. */
const job = detachedJob("sync", 60 * 60 * 1000);

/** Rebuilding every entry's search embeddings takes minutes on a large account, so it runs detached too. */
const rebuildJob = detachedJob(
  "rebuild",
  3 * 60 * 60 * 1000,
  (stdout, run) => journalsDone(stdout) >= journalCount(run),
);

/** The rebuild prints one JSON summary per journal as each finishes. */
function journalsDone(stdout: string): number {
  return (stdout.match(/"ok":\s*true/g) ?? []).length;
}

/** A run.json without `meta` comes from a one-run rebuild over every journal, which prints a single summary. */
function journalCount(run: RunRecord): number {
  return run.meta?.journals ?? 1;
}

function sumField(stdout: string, key: "scanned" | "recalculated"): number {
  return [...stdout.matchAll(new RegExp(`"${key}":\\s*(\\d+)`, "g"))].reduce((n, m) => n + Number(m[1]), 0);
}

export type SyncSummary = {
  downloaded: number;
  uploaded: number;
  failedResources: number;
  alreadyRunning: boolean;
};

export function isSyncRunning(): boolean {
  return job.isRunning();
}

export function readProgress(): SyncProgress {
  return parseSyncProgress(safeRead(job.files().log));
}

/** When this extension last started a sync, or null if it never has. */
export function lastSyncStartedAt(): number | null {
  return job.startedAt();
}

let starting: Promise<void> | null = null;

/**
 * Starts `dayone sync` unless one this extension started is still running. Single-flight within a process:
 * a second call while the first is still finding the CLI (React's dev-mode double mount does this) joins it.
 */
export function startSync(): Promise<void> {
  starting ??= spawnSync().finally(() => {
    starting = null;
  });
  return starting;
}

async function spawnSync(): Promise<void> {
  if (isSyncRunning()) {
    log.debug("joining the sync already running");
    return;
  }
  await job.start(["sync"]);
}

type SyncOutput = {
  ok: boolean;
  locked: boolean;
  fatal_error: string | null;
  resources: { resource: string; changed_count: number; status: string }[];
};

function readSummary(): SyncSummary {
  const output = job.readOutput<SyncOutput>("Sync stopped before it finished");
  if (output.fatal_error) throw new DayOneCliError(output.fatal_error);
  let downloaded = 0;
  let uploaded = 0;
  let failedResources = 0;
  for (const r of output.resources) {
    if (r.resource.startsWith("entries:")) downloaded += r.changed_count;
    if (r.resource.startsWith("outbox:")) uploaded += r.changed_count;
    if (r.status !== "success") failedResources++;
  }
  return { downloaded, uploaded, failedResources, alreadyRunning: output.locked };
}

/**
 * Uploads a write made just now. A sync that was already running may have picked its uploads before the write, so
 * this waits for it to end and then runs a fresh one.
 */
export async function syncAfterWrite(onProgress?: (progress: SyncProgress) => void): Promise<SyncSummary> {
  while (isSyncRunning()) {
    onProgress?.(readProgress());
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return syncAndWait(onProgress);
}

/** Starts a sync (or attaches to the running one) and resolves when it ends. `onProgress` fires about twice a second. */
export async function syncAndWait(onProgress?: (progress: SyncProgress) => void): Promise<SyncSummary> {
  await startSync();
  const started = performance.now();
  while (isSyncRunning()) {
    onProgress?.(readProgress());
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  try {
    const summary = readSummary();
    log.debug("sync finished", { ...summary, ms: Math.round(performance.now() - started) });
    return summary;
  } catch (error) {
    log.error("sync failed", error);
    throw error;
  }
}

export type RebuildProgress = { journalsDone: number; journals: number; entriesDone: number; entries?: number };

export type RebuildStatus =
  | { state: "idle" }
  | { state: "running"; startedAt: number; progress: RebuildProgress }
  | { state: "done"; finishedAt: number; recalculated: number }
  | { state: "failed"; error: unknown };

/** The CLI reports no progress inside a journal, so the count moves a journal at a time. */
function rebuildProgress(stdout: string, run: RunRecord): RebuildProgress {
  return {
    journalsDone: journalsDone(stdout),
    journals: journalCount(run),
    entriesDone: sumField(stdout, "scanned"),
    entries: run.meta?.entries,
  };
}

export function rebuildStatus(): RebuildStatus {
  const run = rebuildJob.readRun();
  if (!run) return { state: "idle" };
  const stdout = rebuildJob.output();
  const progress = rebuildProgress(stdout, run);
  if (rebuildJob.isRunning()) return { state: "running", startedAt: run.startedAt, progress };
  const finishedAt = mtime(rebuildJob.files().out) || run.startedAt;
  if (progress.journals > 0 && progress.journalsDone >= progress.journals) {
    return { state: "done", finishedAt, recalculated: sumField(stdout, "recalculated") };
  }
  const stderr = lastErrorLine(safeRead(rebuildJob.files().log));
  return { state: "failed", error: new DayOneCliError(stderr || "The rebuild stopped before it finished") };
}

/**
 * A rebuild that finished since anyone last heard about it, once. Nothing watches a detached run, so the next
 * command to open (or Doctor, if it's still open) tells the user.
 */
export function takeRebuildNews(status = rebuildStatus()): RebuildStatus | null {
  const startedAt = rebuildJob.startedAt();
  if ((status.state !== "done" && status.state !== "failed") || startedAt === null) return null;
  const announced = join(rebuildJob.files().dir, "announced");
  if (safeRead(announced) === String(startedAt)) return null;
  writeFileSync(announced, String(startedAt));
  if (status.state === "done") log.debug("search index rebuilt", { recalculated: status.recalculated });
  return status;
}

/** Starts rebuilding every entry's search embeddings in the background. Nothing to wait on: Doctor shows the result. */
export async function startRebuild(): Promise<void> {
  // One long CLI job at a time: both write the local database.
  if (isSyncRunning()) throw new Error("A sync is running. Rebuild when it finishes");
  if (rebuildJob.isRunning()) return;
  // One CLI run per journal, so progress can be counted as each one finishes. Journal IDs are passed as arguments.
  const [journals, report] = await Promise.all([listJournals(), runDoctor().catch(() => undefined)]);
  if (journals.length === 0) throw new Error("There are no journals to index yet. Sync first");
  const entries = report?.checks.find((c) => c.check === "local_scale")?.details?.entries;
  await rebuildJob.start(
    journals.map((j) => j.id),
    {
      script:
        'cli="$1"; shift; for j in "$@"; do "$cli" embeddings recalculate-entries --journal-id "$j" || exit $?; done',
      meta: { journals: journals.length, ...(typeof entries === "number" ? { entries } : {}) },
    },
  );
}
