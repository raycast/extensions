import type { RexHost, RexSnapshot } from "./types";

export interface SnapshotStoreState {
  /** The last successful read, possibly from an earlier launch. */
  snapshot?: RexSnapshot;
  /** Why the latest read failed. `snapshot` still holds the last good one. */
  error?: Error;
  /** A read is running, or starts as soon as a view subscribes. */
  isLoading: boolean;
}

export interface SnapshotSource {
  /** Read every host. The signal aborts when the last view closes. */
  read(signal: AbortSignal): Promise<RexSnapshot>;
  /** Event stream arguments for these hosts. Streams restart only when the arguments change. */
  targets(hosts: RexHost[]): string[][];
  /** Follow the streams, calling `onChange` after relevant events, until the returned function runs. */
  follow(targets: string[][], onChange: () => void): () => void;
  /** Fallback poll interval in milliseconds. No polling when omitted. */
  pollMs?: number;
}

export interface SnapshotStore {
  subscribe(listener: () => void): () => void;
  getState(): SnapshotStoreState;
  /** Read now, or once more after the read in flight, which may predate the change. */
  refresh(): void;
}

/** The time during which at least one view is subscribed. */
interface Lifecycle {
  controller: AbortController;
  reading: boolean;
  /** A refresh was requested while a read was in flight. */
  dirty: boolean;
  poll?: ReturnType<typeof setInterval>;
  targetsKey?: string;
  unfollow?: () => void;
}

/**
 * Snapshot state shared by every mounted view, including views pushed on top of each other.
 *
 * The first subscriber starts one read, one set of event streams, and one poller. The last one to leave
 * stops them and aborts the read. Work started in an ended lifecycle never publishes or schedules again.
 */
export function createSnapshotStore(source: SnapshotSource, cached?: RexSnapshot): SnapshotStore {
  let state: SnapshotStoreState = { snapshot: cached, isLoading: true };
  const listeners = new Set<() => void>();
  let live: Lifecycle | undefined;

  const publish = (next: SnapshotStoreState) => {
    state = next;
    for (const listener of listeners) listener();
  };

  const follow = (life: Lifecycle) => {
    const targets = source.targets(state.snapshot?.hosts ?? []);
    const key = JSON.stringify(targets);
    if (key === life.targetsKey) return;
    life.unfollow?.();
    life.targetsKey = key;
    life.unfollow = source.follow(targets, () => request(life));
  };

  const read = async (life: Lifecycle) => {
    life.reading = true;
    life.dirty = false;
    if (!state.isLoading) publish({ ...state, isLoading: true });
    let snapshot: RexSnapshot | undefined;
    let error: Error | undefined;
    try {
      snapshot = await source.read(life.controller.signal);
    } catch (cause) {
      error = cause instanceof Error ? cause : new Error(String(cause));
    }
    if (life !== live) return;
    publish({ snapshot: snapshot ?? state.snapshot, error, isLoading: life.dirty });
    // A listener may have closed the last view.
    if (life !== live) return;
    if (snapshot) follow(life);
    life.reading = false;
    if (life.dirty) void read(life);
  };

  const request = (life: Lifecycle) => {
    if (life !== live) return;
    if (life.reading) life.dirty = true;
    else void read(life);
  };

  const start = () => {
    const life: Lifecycle = { controller: new AbortController(), reading: false, dirty: false };
    live = life;
    void read(life);
    follow(life);
    if (source.pollMs) life.poll = setInterval(() => request(life), source.pollMs);
  };

  const stop = () => {
    const life = live;
    if (!life) return;
    live = undefined;
    clearInterval(life.poll);
    life.unfollow?.();
    life.controller.abort();
    // Nobody is listening; the next subscriber starts with a read.
    state = { ...state, isLoading: true };
  };

  return {
    subscribe(listener) {
      // Wrapped so the same function subscribing twice still counts twice.
      const entry = () => listener();
      listeners.add(entry);
      if (!live) start();
      return () => {
        if (listeners.delete(entry) && listeners.size === 0) stop();
      };
    },
    getState: () => state,
    refresh: () => {
      if (live) request(live);
    },
  };
}
