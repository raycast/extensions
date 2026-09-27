import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Action, LocalStorage, popToRoot, useNavigation } from "@raycast/api";
import type { Session } from "@supabase/supabase-js";
import { createTaskClient, requestTasks } from "./client";
import { readCachedTaskSnapshot, taskSnapshotCacheKey, writeCachedTaskSnapshot } from "./task-cache";
import { useTaskStream } from "./task-stream";
import { clockFace, isReviewExpired, isTaskExpired, sameTaskSnapshot } from "./format";
import type { TaskAction, TaskSnapshot } from "./vendor/task-control";

const SNAPSHOT_POLL_MS = 3_000;
const REVIEW_POLL_MS = 1_000;
const CLOCK_TICK_MS = 1_000;

export function useAccount() {
  const [client] = useState(createTaskClient);
  const [session, setSession] = useState<Session | null>();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    const { data } = client.auth.onAuthStateChange((_event, next) => {
      if (mounted) setSession(next);
    });
    void client.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return;
        setSession(data.session);
        if (error) setError(error.message);
      })
      .catch((error: Error) => {
        if (mounted) {
          setError(error.message);
          setSession(null);
        }
      });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
      client.auth.stopAutoRefresh();
    };
  }, [client]);
  return { client, session, error };
}

type Account = ReturnType<typeof useAccount>;
interface TaskState {
  routeDepth: number;
  registerRoute: () => () => void;
  snapshot: TaskSnapshot | null;
  snapshotRevision: number;
  streamingMessage: string;
  now: number;
  busy: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  perform: (action: TaskAction, displayed: TaskSnapshot) => Promise<{ snapshotRevision: number } | null>;
  signOut: () => Promise<void>;
}
function createTaskStore(value: TaskState) {
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => value,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    publish: (next: TaskState) => {
      value = next;
      listeners.forEach((listener) => listener());
    },
  };
}
const Context = createContext<ReturnType<typeof createTaskStore> | null>(null);

export function TaskProvider({ account, children }: { account: Account; children: ReactNode }) {
  const [routeDepth, setRouteDepth] = useState(0);
  const registerRoute = useCallback(() => {
    setRouteDepth((depth) => depth + 1);
    return () => setRouteDepth((depth) => depth - 1);
  }, []);
  const userId = account.session?.user.id;
  const cacheKey = taskSnapshotCacheKey(userId);
  const [{ snapshot, snapshotRevision }, setSnapshot] = useState<{
    snapshot: TaskSnapshot | null;
    snapshotRevision: number;
  }>({ snapshot: null, snapshotRevision: 0 });
  const nextSnapshotRevision = useRef(0);
  const streamingMessage = useTaskStream(account.client, userId, snapshot?.review ?? null);
  const [error, setError] = useState<string | null>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clock, setClock] = useState(Date.now);
  const capturedLocallyAt = useRef(Date.now());
  const drawnFace = useRef("");
  const current = useRef<TaskSnapshot | null>(null);
  const reading = useRef<Promise<void> | null>(null);
  const mutating = useRef(false);
  const mounted = useRef(true);
  const cacheWrites = useRef(Promise.resolve());

  const accept = useCallback(
    (next: TaskSnapshot, receivedAt = Date.now()) => {
      if (!mounted.current) return null;
      const snapshotRevision = ++nextSnapshotRevision.current;
      capturedLocallyAt.current = receivedAt;
      current.current = next;
      setSnapshot({ snapshot: next, snapshotRevision });
      setClock(Date.now());
      cacheWrites.current = cacheWrites.current
        .then(() => writeCachedTaskSnapshot(cacheKey, next, receivedAt))
        .catch((error) => console.warn("[tasks] Could not cache task state", error));
      return { snapshotRevision };
    },
    [cacheKey],
  );

  const refresh = useCallback(
    async (background = false): Promise<void> => {
      if (mutating.current || !mounted.current) return;
      if (!background) setError(null);
      if (reading.current) {
        await reading.current;
        return;
      }
      if (!background || !current.current) setLoading(true);
      reading.current = (async () => {
        try {
          const response = await requestTasks(account.client, {
            action: { kind: "snapshot" },
            expectedTaskId: null,
            expectedReviewId: null,
          });
          if (!mounted.current) return;
          // A background read that shows nothing new keeps the snapshot it
          // confirms: redrawing the same page every few seconds is what Raycast
          // reports as a rendering loop. The cache still takes the fresh read.
          if (
            response.snapshot &&
            background &&
            current.current &&
            sameTaskSnapshot(current.current, response.snapshot)
          ) {
            const next = response.snapshot;
            cacheWrites.current = cacheWrites.current
              .then(() => writeCachedTaskSnapshot(cacheKey, next, Date.now()))
              .catch((error) => console.warn("[tasks] Could not cache task state", error));
          } else if (response.snapshot) accept(response.snapshot);
          setReadError(response.ok ? null : response.error);
        } catch (error) {
          if (mounted.current) setReadError((error as Error).message);
        } finally {
          reading.current = null;
          if (mounted.current) setLoading(false);
        }
      })();
      return reading.current;
    },
    [account.client, accept, cacheKey],
  );

  useEffect(() => {
    mounted.current = true;
    let poll: ReturnType<typeof setTimeout>;
    const update = async () => {
      await refresh(true);
      if (mounted.current) {
        poll = setTimeout(update, current.current?.review?.status === "checking" ? REVIEW_POLL_MS : SNAPSHOT_POLL_MS);
      }
    };
    if (userId)
      void (async () => {
        const cached = await readCachedTaskSnapshot(cacheKey);
        if (!mounted.current) return;
        if (cached && !current.current) {
          accept(cached.snapshot, cached.receivedAt);
          setLoading(false);
        }
        void update();
      })();
    // Checked every second, redrawn only when a figure on screen moves: the
    // minutes are rounded, so most seconds would draw the same page again.
    const tick = setInterval(() => {
      const shown = current.current;
      if (!shown?.task || shown.task.paused) return;
      const at = Date.now();
      if (clockFace(shown, shown.capturedAt + Math.max(0, at - capturedLocallyAt.current)) !== drawnFace.current)
        setClock(at);
    }, CLOCK_TICK_MS);
    return () => {
      mounted.current = false;
      clearTimeout(poll);
      clearInterval(tick);
    };
  }, [userId, cacheKey, accept, refresh]);

  const perform = async (action: TaskAction, displayed: TaskSnapshot): Promise<{ snapshotRevision: number } | null> => {
    if (mutating.current || !mounted.current) return null;
    mutating.current = true;
    setBusy(true);
    setError(null);
    try {
      await reading.current;
      if (!mounted.current) return null;
      const response = await requestTasks(account.client, {
        action,
        expectedTaskId: displayed.task?.id ?? null,
        expectedReviewId: displayed.review?.id ?? null,
      });
      if (!mounted.current) return null;
      const accepted = response.snapshot ? accept(response.snapshot) : null;
      setError(response.ok ? null : response.error);
      setReadError(null);
      return response.ok ? accepted : null;
    } catch (error) {
      if (mounted.current) setError((error as Error).message);
      return null;
    } finally {
      mutating.current = false;
      if (mounted.current) setBusy(false);
    }
  };

  const signOut = async () => {
    if (mutating.current || !mounted.current) return;
    mutating.current = true;
    setBusy(true);
    try {
      const { error } = await account.client.auth.signOut({ scope: "local" });
      if (error) throw error;
    } catch (error) {
      mutating.current = false;
      if (mounted.current) {
        setError((error as Error).message);
        setBusy(false);
      }
      return;
    }
    mounted.current = false;
    await cacheWrites.current;
    await LocalStorage.removeItem(cacheKey).catch((error) => console.warn("[tasks] Could not clear task cache", error));
    await popToRoot();
  };

  const now = snapshot ? snapshot.capturedAt + Math.max(0, clock - capturedLocallyAt.current) : clock;
  const face = clockFace(snapshot, now);
  useLayoutEffect(() => {
    drawnFace.current = face;
  }, [face]);
  const expired = isTaskExpired(snapshot, now);
  useEffect(() => {
    if (expired) void refresh(true);
  }, [expired, refresh]);
  // A review lapses at one moment rather than counting down, so a single timer
  // wakes the clock for it instead of redrawing a reply form every second.
  const reviewExpired = isReviewExpired(snapshot, now);
  const reviewExpiresAt = snapshot?.review?.expiresAt;
  const reviewExpiresIn = reviewExpiresAt === undefined || reviewExpired ? null : reviewExpiresAt - now;
  useEffect(() => {
    if (reviewExpiresIn === null) return;
    const timer = setTimeout(() => setClock(Date.now()), reviewExpiresIn);
    return () => clearTimeout(timer);
  }, [reviewExpiresIn]);
  useEffect(() => {
    if (reviewExpired) void refresh(true);
  }, [reviewExpired, refresh]);
  // Every screen reads a lapsed review as already gone, as a refresh would
  // report it. New Task still waits for the backend to confirm the free slot.
  const visibleSnapshot = useMemo(
    () => (snapshot && reviewExpired ? { ...snapshot, review: null } : snapshot),
    [snapshot, reviewExpired],
  );

  const value = {
    routeDepth,
    registerRoute,
    snapshot: visibleSnapshot,
    snapshotRevision,
    streamingMessage,
    now,
    busy,
    loading,
    error: error ?? readError,
    refresh,
    perform,
    signOut,
  };
  const [store] = useState(() => createTaskStore(value));
  useLayoutEffect(() => store.publish(value));
  useEffect(
    () => () => {
      store.publish({
        ...store.getSnapshot(),
        snapshot: null,
        busy: false,
        loading: false,
        error: "Open Tasks again to reconnect.",
      });
    },
    [store],
  );
  return <Context.Provider value={store}>{children}</Context.Provider>;
}

export function useTasks(): TaskState {
  const context = useContext(Context);
  if (!context) throw new Error("Task screens need TaskProvider");
  return useSyncExternalStore(context.subscribe, context.getSnapshot);
}

/** Raycast pushes a sibling route, outside the root provider. Carry the same
 * observable store into that route so forms keep receiving live state. */
export function TaskPush({ target, ...props }: Action.Push.Props) {
  const store = useContext(Context);
  return (
    <Action.Push
      {...props}
      target={
        <Context.Provider value={store}>
          <TaskRoute>{target}</TaskRoute>
        </Context.Provider>
      }
    />
  );
}

function TaskRoute({ children }: { children: ReactNode }) {
  const { registerRoute } = useTasks();
  useEffect(registerRoute, [registerRoute]);
  return children;
}

export function useTaskNavigation() {
  const store = useContext(Context);
  const { push } = useNavigation();
  return useCallback(
    (target: ReactNode, onPop?: () => void) =>
      push(
        <Context.Provider value={store}>
          <TaskRoute>{target}</TaskRoute>
        </Context.Provider>,
        onPop,
      ),
    [push, store],
  );
}
