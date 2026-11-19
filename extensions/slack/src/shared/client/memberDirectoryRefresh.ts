export const memberDirectoryFreshMs = 60 * 60 * 1000;
export const memberDirectoryMaxAgeMs = 24 * 60 * 60 * 1000;
/** A failed users.list scan waits this long before another search is allowed to start a new one. */
export const memberDirectoryFailureBackoffMs = 60 * 1000;

export function memberDirectoryFailureCoolingDown(failedAt: number | undefined, now: number): boolean {
  return failedAt !== undefined && now - failedAt < memberDirectoryFailureBackoffMs;
}

export type MemberDirectoryReadPlan = {
  /** `live` reads the in-progress scan. `fresh` and `stale` are served from the snapshot. */
  serve: "fresh" | "stale" | "live";
  /** Start a scan when one is not already running. A stale snapshot is still returned immediately. */
  startLoad: boolean;
  /** The previous failure's backoff has elapsed, so the next read may scan again. */
  discardFailedLoad: boolean;
};

/**
 * Decides whether a member-directory read should use the cache, join the current scan, or start one.
 * A failed scan stays in place during its backoff so a stale snapshot can keep serving searches without
 * starting a new `users.list` walk on every keystroke.
 */
export function planMemberDirectoryRead(input: {
  hasSnapshot: boolean;
  snapshotAgeMs: number;
  load: { finished: boolean; failedAt?: number } | undefined;
  now: number;
}): MemberDirectoryReadPlan {
  if (input.hasSnapshot && input.snapshotAgeMs < memberDirectoryFreshMs) {
    return { serve: "fresh", startLoad: false, discardFailedLoad: false };
  }

  const stale = input.hasSnapshot && input.snapshotAgeMs < memberDirectoryMaxAgeMs;
  const failed = input.load?.finished === true && input.load.failedAt !== undefined;
  if (failed && memberDirectoryFailureCoolingDown(input.load?.failedAt, input.now)) {
    return { serve: stale ? "stale" : "live", startLoad: false, discardFailedLoad: false };
  }

  const inProgress = input.load !== undefined && !input.load.finished;
  return {
    serve: stale ? "stale" : "live",
    startLoad: !inProgress,
    discardFailedLoad: failed,
  };
}
