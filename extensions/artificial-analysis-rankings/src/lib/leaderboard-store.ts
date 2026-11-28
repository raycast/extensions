import { errorMessage, LeaderboardError, type ErrorKind } from "./api";
import { isFresh, type LeaderboardService } from "./cache";
import { formatRetrievedAt } from "./format";
import type { LeaderboardSnapshot } from "./models";

export interface LoadError {
  kind?: ErrorKind;
  message: string;
  retryAt?: number;
}

/** The error message, plus when a rate-limited refresh may be retried. */
export function describeLoadError(error: LoadError): string {
  return `${error.message}${error.retryAt ? ` Retry after ${formatRetrievedAt(error.retryAt)}.` : ""}`;
}

export interface LeaderboardState {
  snapshot?: LeaderboardSnapshot;
  error?: LoadError;
  isLoading: boolean;
}

export type RefreshOutcome =
  | { status: "updated"; snapshot: LeaderboardSnapshot }
  | { status: "failed"; error: LoadError }
  | { status: "cancelled" };

function loadError(error: unknown): LoadError {
  return {
    kind: error instanceof LeaderboardError ? error.kind : undefined,
    message: errorMessage(error),
    retryAt: error instanceof LeaderboardError ? error.retryAt : undefined,
  };
}

/**
 * One leaderboard shared by every open screen of a command: they show the same data, a refresh anywhere updates
 * them all, and screens opened during a fetch wait for it instead of starting another.
 */
export class LeaderboardStore {
  private state: LeaderboardState;
  private readonly listeners = new Set<() => void>();
  private request?: { controller: AbortController; promise: Promise<RefreshOutcome> };
  private screens = 0;

  constructor(
    private readonly service: Pick<LeaderboardService, "readSnapshot" | "refresh">,
    private readonly now: () => number = Date.now,
  ) {
    const snapshot = service.readSnapshot();
    // A missing or stale snapshot is about to be fetched by the first screen.
    this.state = { snapshot, isLoading: !snapshot || !isFresh(snapshot, now()) };
  }

  getSnapshot = (): LeaderboardState => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** Marks a screen as open. When the last one closes, an unfinished fetch is cancelled. */
  retain(): () => void {
    this.screens++;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.screens--;
      if (this.screens === 0) this.request?.controller.abort();
    };
  }

  /** Refreshes once for every screen; without `force`, a fresh snapshot is kept as is. */
  refresh(force: boolean): Promise<RefreshOutcome> {
    if (this.request) return this.request.promise;
    const { snapshot } = this.state;
    if (!force && snapshot && isFresh(snapshot, this.now())) {
      if (this.state.isLoading) this.publish({ ...this.state, isLoading: false });
      return Promise.resolve({ status: "updated", snapshot });
    }
    const controller = new AbortController();
    this.publish({ ...this.state, isLoading: true, error: undefined });
    const promise = this.service.refresh(force, controller.signal).then(
      (next): RefreshOutcome => {
        if (controller.signal.aborted) return this.cancelled();
        this.publish({ snapshot: next, isLoading: false });
        return { status: "updated", snapshot: next };
      },
      (error: unknown): RefreshOutcome => {
        if (controller.signal.aborted) return this.cancelled();
        const failure = loadError(error);
        this.publish({ ...this.state, error: failure, isLoading: false });
        return { status: "failed", error: failure };
      },
    );
    this.request = { controller, promise };
    void promise.finally(() => {
      if (this.request?.promise === promise) this.request = undefined;
    });
    return promise;
  }

  private cancelled(): RefreshOutcome {
    this.publish({ ...this.state, isLoading: false });
    return { status: "cancelled" };
  }

  private publish(state: LeaderboardState) {
    this.state = state;
    this.listeners.forEach((listener) => listener());
  }
}
