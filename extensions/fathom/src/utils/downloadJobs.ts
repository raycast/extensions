/**
 * Durable record of in-flight download jobs, keyed by recording.
 *
 * Fathom generates media asynchronously: the POST returns a `download_id` and
 * the file appears ~30-40s later. Raycast unloads the command when the user
 * presses Escape, so without persisting that id the job is orphaned — the work
 * continues server-side but nothing is left that can claim it, and the next
 * attempt starts over.
 *
 * So the id is written the moment the POST returns, and reopening the command
 * resumes polling the existing job. It is deleted again as soon as a transfer
 * starts: from that point the runner's own status file is the durable record,
 * and adoption reads THAT rather than anything here. This store therefore only
 * ever describes the seconds between the POST and the first byte.
 *
 * Deliberately stores no signed URL: those are bearer credentials with a ~24h
 * life, and a repeat POST re-mints one cheaply once the media exists.
 */

import { logger } from "@chrismessina/raycast-logger";
import { LocalStorage } from "@raycast/api";

const STORAGE_KEY = "fathom-download-jobs";

/** Jobs older than this are stale; the signed URL behind them has expired. */
const JOB_TTL_MS = 12 * 60 * 60 * 1000;

export interface PendingJob {
  recordingId: string;
  downloadId: string;
  requestedAt: number;
}

type JobMap = Record<string, PendingJob>;

/**
 * Serializes read-modify-write cycles within this command instance.
 *
 * The store is one LocalStorage key holding a map. Two downloads started
 * moments apart would otherwise each read the map, each add their own entry,
 * and the later write would erase the earlier job — losing exactly the durable
 * record this module exists to keep.
 *
 * This does NOT serialize across separate Raycast command instances; nothing
 * available here can. It closes the realistic window (two actions fired in one
 * view) rather than pretending to be a distributed lock.
 */
let writeChain: Promise<unknown> = Promise.resolve();

function withLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeChain.then(operation, operation);
  // Keep the chain alive regardless of individual failures.
  writeChain = result.catch(() => undefined);
  return result;
}

async function readAll(): Promise<JobMap> {
  try {
    const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as JobMap) : {};
  } catch (error) {
    // Corrupt storage must not break the command; losing a job record only
    // costs one re-request.
    logger.warn("[downloadJobs] Could not read job store:", error);
    return {};
  }
}

async function writeAll(jobs: JobMap): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
}

/** Record a job immediately after the POST, before any polling. */
export async function rememberJob(job: PendingJob): Promise<void> {
  await withLock(async () => {
    const jobs = await readAll();
    jobs[job.recordingId] = job;
    await writeAll(prune(jobs));
  });
  logger.log(`[downloadJobs] Remembered ${job.downloadId} for recording ${job.recordingId}`);
}

/**
 * Look up a resumable job for a recording, if one is still fresh.
 *
 * Persists the pruned map when anything expired, so stale records do not
 * accumulate in LocalStorage indefinitely.
 */
export async function getJob(recordingId: string): Promise<PendingJob | undefined> {
  return withLock(async () => {
    const all = await readAll();
    const fresh = prune(all);
    if (Object.keys(fresh).length !== Object.keys(all).length) await writeAll(fresh);
    return fresh[recordingId];
  });
}

export async function forgetJob(recordingId: string): Promise<void> {
  await withLock(async () => {
    const jobs = await readAll();
    if (!jobs[recordingId]) return;
    delete jobs[recordingId];
    await writeAll(jobs);
  });
}

function prune(jobs: JobMap, now = Date.now()): JobMap {
  const fresh: JobMap = {};
  for (const [recordingId, job] of Object.entries(jobs)) {
    if (now - job.requestedAt < JOB_TTL_MS) fresh[recordingId] = job;
  }
  return fresh;
}
