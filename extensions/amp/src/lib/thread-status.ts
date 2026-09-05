import { Cache } from "@raycast/api";
import {
  ampBaseURL,
  getLiveThreads,
  getThreadsByIds,
  listThreads,
  readRunState,
} from "./amp";
import {
  getTrackedRuns,
  getUnreadThreadIds,
  removeTrackedRuns,
} from "./storage";
import type { AmpThreadSummary, LiveAmpThread, TrackedRun } from "../types";

export type ThreadStatus =
  "Working" | "Starting" | "Launching" | "Complete" | "Failed";

export interface ThreadView {
  threadId: string;
  thread?: AmpThreadSummary;
  live?: LiveAmpThread;
  trackedRun?: TrackedRun;
  unread: boolean;
  exitCode?: number;
  error?: string;
}

/**
 * A launch that has produced neither a thread nor an error after this long is
 * not going to; without a cutoff it would count as running forever.
 */
const LAUNCH_TIMEOUT_MS = 15 * 60 * 1000;

/** Failed launches are kept visible this long so their error can be read. */
const FAILED_RUN_RETENTION_MS = 24 * 60 * 60 * 1000;

function runAgeMs(run: TrackedRun | undefined): number {
  const created = Date.parse(run?.createdAt ?? "");
  return Number.isFinite(created) ? Date.now() - created : Number.NaN;
}

const cache = new Cache();
const VIEWS_CACHE_KEY = "thread-views-v1";

/**
 * Commands remount from scratch every time they are opened, and a full load
 * takes seconds. The last result is cached so reopening renders immediately
 * while the refresh runs behind it.
 */
export function readCachedThreadViews(): ThreadView[] {
  const raw = cache.get(VIEWS_CACHE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ThreadView[];
  } catch {
    return [];
  }
}

export function cacheThreadViews(views: ThreadView[]): void {
  cache.set(VIEWS_CACHE_KEY, JSON.stringify(views));
}

export function statusForThread(view: ThreadView): ThreadStatus {
  if (view.exitCode !== undefined && view.exitCode !== 0) return "Failed";
  if (view.live?.working) return "Working";
  const age = runAgeMs(view.trackedRun);
  const young = Number.isFinite(age) && age <= LAUNCH_TIMEOUT_MS;
  if (view.thread || view.live) {
    // A young tracked thread holding only our own message and not yet
    // reported live is still spinning up its Orb, not finished.
    if (young && !view.live && (view.thread?.messageCount ?? 0) <= 1) {
      return "Starting";
    }
    return "Complete";
  }
  if (view.trackedRun && !young) return "Failed";
  return view.threadId ? "Starting" : "Launching";
}

export function titleForThread(view: ThreadView): string {
  return (
    view.thread?.title ??
    view.live?.title ??
    view.trackedRun?.promptPreview ??
    view.threadId
  );
}

export function webURLForThread(view: ThreadView): string {
  return (
    view.live?.url ?? new URL(`threads/${view.threadId}`, ampBaseURL()).href
  );
}

export function updatedAtForThread(view: ThreadView): string {
  return (
    view.thread?.updated ??
    view.live?.updatedAt ??
    view.trackedRun?.createdAt ??
    ""
  );
}

export async function loadThreads(
  options: { all?: boolean } = {},
): Promise<ThreadView[]> {
  const allTracked = await getTrackedRuns();
  const allStates = await Promise.all(allTracked.map(readRunState));

  // A run that never produced a thread ID is either mid-launch (young) or
  // permanently dead (old). Prune dead ones so they stop being re-read and
  // recounted on every refresh; keep recent failures visible for their error.
  const deadRunIds = allTracked
    .filter((run, index) => {
      if (allStates[index].threadId) return false;
      const age = runAgeMs(run);
      if (!Number.isFinite(age)) return true;
      return age > FAILED_RUN_RETENTION_MS;
    })
    .map((run) => run.runId);
  await removeTrackedRuns(deadRunIds);
  const dead = new Set(deadRunIds);
  const tracked = allTracked.filter((run) => !dead.has(run.runId));
  const states = allStates.filter(
    (_, index) => !dead.has(allTracked[index].runId),
  );

  const [threads, liveThreads] = await Promise.all([
    listThreads(options.all ?? true),
    getLiveThreads(),
  ]);
  const threadMap = new Map(threads.map((thread) => [thread.id, thread]));
  const liveMap = new Map(liveThreads.map((thread) => [thread.id, thread]));
  const trackedMap = new Map<
    string,
    { run: TrackedRun; state: (typeof states)[number] }
  >();
  tracked.forEach((run, index) => {
    const state = states[index];
    if (state.threadId) trackedMap.set(state.threadId, { run, state });
  });

  // Tracked threads can fall outside the listing page (or a launch can be so
  // fresh the listing has not caught up); resolve those directly by ID so they
  // never sit in "Starting" with the thread actually live.
  const unlisted = [...trackedMap.keys()].filter(
    (threadId) => !threadMap.has(threadId) && !liveMap.has(threadId),
  );
  if (unlisted.length) {
    try {
      for (const thread of await getThreadsByIds(unlisted)) {
        threadMap.set(thread.id, thread);
      }
    } catch {
      // The main listing succeeded; the affected threads simply stay
      // "Starting" until the next refresh.
    }
  }

  const orderedIds = [
    ...liveThreads.map((thread) => thread.id),
    ...threads.map((thread) => thread.id),
    ...trackedMap.keys(),
  ];
  const uniqueIds = [...new Set(orderedIds)];

  const views: ThreadView[] = uniqueIds.map((threadId) => {
    const trackedEntry = trackedMap.get(threadId);
    return {
      threadId,
      unread: false,
      trackedRun: trackedEntry?.run,
      exitCode: trackedEntry?.state.exitCode,
      error: trackedEntry?.state.error,
      thread: threadMap.get(threadId),
      live: liveMap.get(threadId),
    };
  });
  const unreadIds = await getUnreadThreadIds(
    views.map((view) => ({
      id: view.threadId,
      updatedAt: updatedAtForThread(view),
    })),
    views
      .filter((view) =>
        ["Working", "Starting", "Launching"].includes(statusForThread(view)),
      )
      .map((view) => view.threadId),
  );
  const result = views.map((view) => ({
    ...view,
    unread:
      statusForThread(view) === "Complete" && unreadIds.has(view.threadId),
  }));
  cacheThreadViews(result);
  return result;
}
