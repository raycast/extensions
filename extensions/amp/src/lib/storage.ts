import { LocalStorage, environment } from "@raycast/api";
import { access, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { CaptureEntry, TrackedRun } from "../types";

const CAPTURES_KEY = "pending-captures-v1";
const RUNS_KEY = "tracked-runs-v1";
const THREAD_READ_STATE_KEY = "thread-read-state-v1";

interface ThreadReadState {
  initializedAt: string;
  seenUpdated: Record<string, string>;
  runningIds: string[];
  unreadIds: string[];
}

export interface ThreadRevision {
  id: string;
  updatedAt: string;
}

async function readArray<T>(key: string): Promise<T[]> {
  const value = await LocalStorage.getItem<string>(key);
  if (!value) return [];
  try {
    return JSON.parse(value) as T[];
  } catch {
    return [];
  }
}

async function getThreadReadState(): Promise<ThreadReadState | undefined> {
  const value = await LocalStorage.getItem<string>(THREAD_READ_STATE_KEY);
  if (!value) return undefined;
  try {
    const parsed = JSON.parse(value) as ThreadReadState;
    return parsed.initializedAt && parsed.seenUpdated
      ? {
          ...parsed,
          runningIds: parsed.runningIds ?? [],
          unreadIds: parsed.unreadIds ?? [],
        }
      : undefined;
  } catch {
    return undefined;
  }
}

function isAfter(candidate: string, baseline: string): boolean {
  const candidateTime = Date.parse(candidate);
  const baselineTime = Date.parse(baseline);
  if (Number.isFinite(candidateTime) && Number.isFinite(baselineTime)) {
    return candidateTime > baselineTime;
  }
  return candidate > baseline;
}

export async function getUnreadThreadIds(
  revisions: ThreadRevision[],
  runningIds: string[],
): Promise<Set<string>> {
  const state = await getThreadReadState();
  if (!state) {
    const initializedAt = new Date().toISOString();
    await LocalStorage.setItem(
      THREAD_READ_STATE_KEY,
      JSON.stringify({
        initializedAt,
        seenUpdated: Object.fromEntries(
          revisions.map((revision) => [revision.id, revision.updatedAt]),
        ),
        runningIds,
        unreadIds: [],
      } satisfies ThreadReadState),
    );
    return new Set();
  }

  const running = new Set(runningIds);
  const unread = new Set(state.unreadIds);
  for (const previouslyRunning of state.runningIds) {
    if (!running.has(previouslyRunning)) unread.add(previouslyRunning);
  }
  for (const revision of revisions) {
    if (running.has(revision.id)) {
      unread.delete(revision.id);
      continue;
    }
    const seenUpdated = state.seenUpdated[revision.id];
    const hasNewUpdate =
      seenUpdated !== undefined
        ? isAfter(revision.updatedAt, seenUpdated)
        : isAfter(revision.updatedAt, state.initializedAt);
    if (hasNewUpdate) unread.add(revision.id);
  }
  state.runningIds = runningIds;
  state.unreadIds = [...unread];
  await LocalStorage.setItem(THREAD_READ_STATE_KEY, JSON.stringify(state));
  return unread;
}

export async function markThreadRead(
  threadId: string,
  updatedAt: string,
): Promise<void> {
  const state = (await getThreadReadState()) ?? {
    initializedAt: new Date().toISOString(),
    seenUpdated: {},
    runningIds: [],
    unreadIds: [],
  };
  state.seenUpdated[threadId] = updatedAt || new Date().toISOString();
  state.unreadIds = state.unreadIds.filter((id) => id !== threadId);
  await LocalStorage.setItem(THREAD_READ_STATE_KEY, JSON.stringify(state));
}

/** A capture this old was for some other thread; don't attach it silently. */
const CAPTURE_MAX_AGE_MS = 30 * 60 * 1000;

/**
 * Screenshots live on disk while their records live in LocalStorage, so a
 * deleted or purged file leaves a record pointing at nothing, and failed
 * launches leave old captures behind. Drop dead or expired records rather
 * than letting them break or bloat a later thread launch.
 */
export async function getPendingCaptures(): Promise<CaptureEntry[]> {
  const captures = await readArray<CaptureEntry>(CAPTURES_KEY);
  if (!captures.length) return captures;

  const usable = await Promise.all(
    captures.map(async (capture) => {
      const created = Date.parse(capture.createdAt);
      if (Number.isFinite(created) && Date.now() - created > CAPTURE_MAX_AGE_MS)
        return false;
      try {
        await access(capture.path);
        return true;
      } catch {
        return false;
      }
    }),
  );

  const live = captures.filter((_, index) => usable[index]);
  if (live.length !== captures.length) {
    await LocalStorage.setItem(CAPTURES_KEY, JSON.stringify(live));
    await Promise.all(
      captures
        .filter((_, index) => !usable[index])
        .map((capture) =>
          rm(capture.path, { force: true }).catch(() => undefined),
        ),
    );
  }
  return live;
}

/**
 * Only one capture is ever pending: capturing again replaces the previous
 * screenshot instead of accumulating a pile that bloats the launch.
 */
export async function replacePendingCapture(
  capture: CaptureEntry,
): Promise<void> {
  const previous = await getPendingCaptures();
  await LocalStorage.setItem(CAPTURES_KEY, JSON.stringify([capture]));
  await Promise.all(
    previous
      .filter((entry) => entry.path !== capture.path)
      .map((entry) => rm(entry.path, { force: true }).catch(() => undefined)),
  );
}

export async function clearPendingCaptures(): Promise<void> {
  const captures = await getPendingCaptures();
  await LocalStorage.removeItem(CAPTURES_KEY);
  await Promise.all(
    captures.map((capture) =>
      rm(capture.path, { force: true }).catch(() => undefined),
    ),
  );
}

/**
 * Removes only the named captures, so a screenshot taken while the form was
 * open survives a launch that did not include it.
 */
export async function removePendingCaptures(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const removing = new Set(ids);
  const captures = await getPendingCaptures();
  const removed = captures.filter((capture) => removing.has(capture.id));
  await LocalStorage.setItem(
    CAPTURES_KEY,
    JSON.stringify(captures.filter((capture) => !removing.has(capture.id))),
  );
  await Promise.all(
    removed.map((capture) =>
      rm(capture.path, { force: true }).catch(() => undefined),
    ),
  );
}

export async function getTrackedRuns(): Promise<TrackedRun[]> {
  return readArray<TrackedRun>(RUNS_KEY);
}

export async function addTrackedRun(run: TrackedRun): Promise<void> {
  const runs = [run, ...(await getTrackedRuns())].slice(0, 500);
  await LocalStorage.setItem(RUNS_KEY, JSON.stringify(runs));
}

export async function removeTrackedRuns(runIds: string[]): Promise<void> {
  if (!runIds.length) return;
  const removing = new Set(runIds);
  const runs = await getTrackedRuns();
  await LocalStorage.setItem(
    RUNS_KEY,
    JSON.stringify(runs.filter((run) => !removing.has(run.runId))),
  );
}

export async function getCapturesDirectory(): Promise<string> {
  const path = join(environment.supportPath, "captures");
  await mkdir(path, { recursive: true });
  return path;
}

export async function getRunsDirectory(): Promise<string> {
  const path = join(environment.supportPath, "runs");
  await mkdir(path, { recursive: true });
  return path;
}
