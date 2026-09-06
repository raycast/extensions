import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { SessionBridge } from "../services/session-bridge";
import { Detail, showToast, Toast } from "@raycast/api";
import type { Player, Queue } from "../domain/model";
import { activePlayerStore, createRuntime, loadCredentials } from "../runtime";
import { reportError } from "./feedback";
import { SetupForm } from "./setup-form";

type Runtime = ReturnType<typeof createRuntime>;
interface Session extends Runtime {
  bridge: SessionBridge<Session>;
  players: Player[];
  queues: Queue[];
  activeId?: string;
  revision: number;
  loading: boolean;
  busy: boolean;
  run: (task: () => Promise<void>, message?: string) => Promise<void>;
  refresh: () => Promise<void>;
}
const Context = createContext<Session | null>(null);

/** Raycast renders pushed targets outside their parent's React tree; bridge them to the root-owned session. */
export function SessionRoute({
  children,
  sessionBridge,
}: {
  children: ReactNode;
  sessionBridge?: SessionBridge<Session>;
}) {
  return sessionBridge ? (
    <SharedSession bridge={sessionBridge}>{children}</SharedSession>
  ) : (
    <RootSession>{children}</RootSession>
  );
}

function SharedSession({ children, bridge }: { children: ReactNode; bridge: SessionBridge<Session> }) {
  const session = useSyncExternalStore(bridge.subscribe, bridge.getSnapshot);
  if (!session) return <Detail isLoading markdown="Loading music…" />;
  return <Context.Provider value={session}>{children}</Context.Provider>;
}

function RootSession({ children }: { children: ReactNode }) {
  const [runtime, setRuntime] = useState<Runtime | undefined>(() => {
    try {
      return createRuntime();
    } catch {
      return undefined;
    }
  });
  const [loadingStored, setLoadingStored] = useState(!runtime);

  useEffect(() => {
    if (runtime) return;
    void loadCredentials().then((stored) => {
      if (stored) {
        try {
          setRuntime(createRuntime(stored));
        } catch {
          // invalid stored credentials
        }
      }
      setLoadingStored(false);
    });
  }, [runtime]);

  if (loadingStored) {
    return <Detail isLoading markdown="Starting Audio Assistant…" />;
  }

  if (!runtime) {
    return <SetupForm onConnected={(credentials) => setRuntime(createRuntime(credentials))} />;
  }

  return <MusicSession runtime={runtime}>{children}</MusicSession>;
}

export function MusicSession({ runtime, children }: { runtime: Runtime; children: ReactNode }) {
  const [bridge] = useState(() => new SessionBridge<Session>());
  const [players, setPlayers] = useState<Player[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const refresh = useCallback(async () => {
    const [playerResult, queueResult, scopeResult] = await Promise.allSettled([
      runtime.service.getPlayers(),
      runtime.service.getQueues(),
      runtime.service.getScope(),
    ]);
    let failure: unknown;
    if (playerResult.status === "fulfilled") setPlayers(playerResult.value);
    else failure = playerResult.reason;
    if (queueResult.status === "fulfilled") setQueues(queueResult.value);
    else failure ??= queueResult.reason;
    if (scopeResult.status === "fulfilled") setActiveId(await activePlayerStore.get(scopeResult.value));
    else failure ??= scopeResult.reason;
    setRevision((value) => value + 1);
    if (failure) throw failure;
  }, [runtime]);
  useEffect(() => {
    void refresh()
      .catch(reportError)
      .finally(() => setLoading(false));
    return () => runtime.service.dispose();
  }, [refresh, runtime]);
  async function run(task: () => Promise<void>, message?: string) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    try {
      await task();
      await refresh();
      if (message)
        await showToast({
          style: Toast.Style.Success,
          title: `${runtime.service.mode === "demo" ? "Demo: " : ""}${message}`,
        });
    } catch (error) {
      await reportError(error);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  const session = { ...runtime, players, queues, activeId, revision, loading, busy, run, refresh, bridge };
  useEffect(() => {
    bridge.publish(session);
  });
  return <Context.Provider value={session}>{children}</Context.Provider>;
}
export function useMusic() {
  const session = useContext(Context);
  if (!session) throw new Error("MusicSession is required.");
  return session;
}
