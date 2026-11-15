import { getPreferenceValues, LocalStorage, showToast, Toast } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { randomUUID } from "node:crypto";
import type { Session, Snapshot } from "./protocol.js";
import { Hub, HubError } from "./core.js";
import type { Connection } from "./core.js";

import { loadConnection, onConnectionChange, profiles, type BridgeProfile } from "./connections.js";
import { portRange } from "./discovery.js";
export { recentKey } from "./connections.js";

export const draftKey = (bindingId: string, identity?: string) => `draft:${identity ?? "unconfigured"}:${bindingId}`;
export const errorText = (error: unknown) =>
  error instanceof HubError
    ? error.message
    : "Cannot reach the local hub. Check Argo, the configuration path, and private file permissions (chmod 600).";

export function useHub(bindingId?: string, selectedProfileId?: string, expectedConnectionKey?: string) {
  const stop = useRef<() => void>(() => undefined);
  const [selected, setSelected] = useState<Awaited<ReturnType<typeof loadConnection>>>();
  const [connectionKey, setConnectionKey] = useState<string>();
  const [profileName, setProfileName] = useState("Bridge");
  const [address, setAddress] = useState<string>();
  const [profileId, setProfileId] = useState("default");
  const [sessions, setSessions] = useState<Session[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const [connection, setConnection] = useState<Connection>("connecting");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const hub = useRef<Hub | undefined>(undefined);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);
  const [attempt, setAttempt] = useState(0);
  const { configPath, portStart, portEnd } = getPreferenceValues<Preferences>();

  const reconnect = useCallback(() => {
    stop.current();
    hub.current?.close();
    hub.current = undefined;
    setConnection("connecting");
    setSnapshot(undefined);
    setConnectionKey(undefined);
    setSelected(undefined);
    setAttempt((value) => value + 1);
  }, []);
  useEffect(() => onConnectionChange(reconnect), [reconnect]);

  useEffect(() => {
    const controller = new AbortController();
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let client: Hub | undefined;
    let pending: Promise<number> | undefined;
    let again = false;
    let lastCursor = 0;
    const cleanup = () => {
      controller.abort();
      client?.close();
      if (debounce) clearTimeout(debounce);
      if (hub.current === client) hub.current = undefined;
    };
    stop.current = cleanup;
    setLoading(true);
    setSnapshot(undefined);
    setSessions([]);
    setConnectionKey(undefined);
    setAddress(undefined);
    setSelected(undefined);
    setConnection("connecting");
    setError(undefined);
    async function load(): Promise<number> {
      if (pending) {
        again = true;
        return pending;
      }
      pending = (async () => {
        do {
          again = false;
          if (!client || controller.signal.aborted) return lastCursor;
          if (bindingId) {
            const next = await client.snapshot(bindingId);
            if (controller.signal.aborted) return lastCursor;
            lastCursor = next.cursor;
            setSnapshot(next);
          } else {
            const next = await client.sessions();
            if (controller.signal.aborted) return lastCursor;
            lastCursor = next.cursor;
            setSessions(next.sessions);
          }
          setError(undefined);
        } while (again && !controller.signal.aborted);
        return lastCursor;
      })();
      try {
        return await pending;
      } finally {
        pending = undefined;
      }
    }
    const refresh = async () => {
      try {
        await load();
      } catch (cause) {
        if (!controller.signal.aborted) setError(errorText(cause));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    refreshRef.current = refresh;
    async function start() {
      try {
        const loaded = await loadConnection(LocalStorage, configPath, selectedProfileId, portRange(portStart, portEnd));
        if (controller.signal.aborted) return;
        const { config, profile, connectionKey: key } = loaded;
        if (expectedConnectionKey && key !== expectedConnectionKey) {
          setError("Bridge identity changed. Open All Sessions to choose a connection; your original draft is kept.");
          setConnection("offline");
          return;
        }
        setSelected(loaded);
        setConnectionKey(key);
        setProfileName(profile.name);
        setProfileId(profile.id);
        setAddress(config.url);
        client = new Hub(config);
        hub.current = client;
        // The subscription starts at the snapshot's cursor, closing the fetch/subscribe race.
        const cursor = await load();
        if (controller.signal.aborted) return;
        setLoading(false);
        await client.watch(
          cursor,
          controller.signal,
          (event) => {
            if (bindingId && event.bindingId !== bindingId) return;
            if (debounce) return;
            debounce = setTimeout(() => {
              debounce = undefined;
              void refresh();
            }, 200);
          },
          load,
          (value) => {
            if (!controller.signal.aborted) setConnection(value);
          },
        );
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(errorText(cause));
          setConnection("offline");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void start();
    return cleanup;
  }, [bindingId, selectedProfileId, expectedConnectionKey, configPath, portStart, portEnd, attempt]);

  const refresh = useCallback(async () => {
    await refreshRef.current();
  }, []);
  return {
    sessions,
    snapshot,
    connection,
    loading,
    error,
    hub,
    refresh,
    reconnect,
    connectionKey,
    profileName,
    profileId,
    address,
    selected,
  };
}

export type BridgeFeed = {
  profile: BridgeProfile;
  connectionKey?: string;
  address?: string;
  sessions: Session[];
  connection: Connection;
  loading: boolean;
  error?: string;
};

export function useBridges() {
  const [bridges, setBridges] = useState<BridgeFeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [savedCount, setSavedCount] = useState(0);
  const [defaultUnavailable, setDefaultUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const stop = useRef<() => void>(() => undefined);
  const reconnect = useCallback(() => {
    stop.current();
    setAttempt((value) => value + 1);
  }, []);
  const { configPath, portStart, portEnd } = getPreferenceValues<Preferences>();
  useEffect(() => onConnectionChange(reconnect), [reconnect]);
  useEffect(() => {
    const controller = new AbortController();
    const clients = new Set<Hub>();
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const cleanup = () => {
      controller.abort();
      clients.forEach((client) => client.close());
      timers.forEach(clearTimeout);
    };
    stop.current = cleanup;
    setBridges([]);
    setLoading(true);
    setError(undefined);
    setDefaultUnavailable(false);
    const update = (id: string, change: Partial<BridgeFeed>) => {
      if (!controller.signal.aborted)
        setBridges((current) =>
          current.map((bridge) => (bridge.profile.id === id ? { ...bridge, ...change } : bridge)),
        );
    };
    async function start(profile: BridgeProfile) {
      let client: Hub | undefined;
      let configured = false;
      let cursor = 0;
      let pending: Promise<number> | undefined;
      let again = false;
      let debounce: ReturnType<typeof setTimeout> | undefined;
      async function load(): Promise<number> {
        if (pending) {
          again = true;
          return pending;
        }
        pending = (async () => {
          do {
            again = false;
            if (!client || controller.signal.aborted) return cursor;
            const result = await client.sessions();
            cursor = result.cursor;
            update(profile.id, { sessions: result.sessions, error: undefined });
          } while (again && !controller.signal.aborted);
          return cursor;
        })();
        try {
          return await pending;
        } catch (cause) {
          update(profile.id, { error: errorText(cause) });
          throw cause;
        } finally {
          pending = undefined;
        }
      }
      try {
        const loaded = await loadConnection(LocalStorage, configPath, profile.id, portRange(portStart, portEnd));
        if (controller.signal.aborted) return;
        configured = true;
        update(profile.id, { connectionKey: loaded.connectionKey, address: loaded.config.url });
        client = new Hub(loaded.config);
        clients.add(client);
        const initial = await load();
        if (controller.signal.aborted) return;
        update(profile.id, { loading: false });
        // Each bridge watches its own cursor; a failed bridge never gates its siblings.
        void client
          .watch(
            initial,
            controller.signal,
            () => {
              if (debounce || controller.signal.aborted) return;
              debounce = setTimeout(() => {
                timers.delete(debounce!);
                debounce = undefined;
                void load().catch(() => undefined);
              }, 200);
              timers.add(debounce);
            },
            load,
            (connection) => update(profile.id, { connection }),
          )
          .catch((cause) => update(profile.id, { connection: "offline", error: errorText(cause) }));
      } catch (cause) {
        if (controller.signal.aborted) return;
        if (profile.id === "default" && !configured) {
          setDefaultUnavailable(true);
          setBridges((current) => current.filter((bridge) => bridge.profile.id !== "default"));
        } else update(profile.id, { connection: "offline", error: errorText(cause), loading: false });
        client?.close();
      }
    }
    void (async () => {
      try {
        const saved = await profiles(LocalStorage);
        if (controller.signal.aborted) return;
        setSavedCount(saved.length);
        const entries = [
          ...saved,
          { id: "default", name: "Default bridge", configPath: configPath?.trim() || "~/.argo/client.json" },
        ];
        setBridges(entries.map((profile) => ({ profile, sessions: [], connection: "connecting", loading: true })));
        await Promise.all(entries.map(start));
      } catch {
        if (!controller.signal.aborted)
          setError("Could not read saved bridges. Open Connection Setup to repair saved references.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return cleanup;
  }, [configPath, portStart, portEnd, attempt]);
  return { bridges, loading, error, savedCount, defaultUnavailable, reconnect };
}

export function useDraft(bindingId: string, identity?: string) {
  const [text, setText] = useState("");
  const [ready, setReady] = useState(false);
  const writes = useRef<Promise<unknown>>(Promise.resolve());
  const current = useRef("");
  const pending = useRef<{ id: string; text: string; generation: string } | undefined>(undefined);
  useEffect(() => {
    let active = true;
    setReady(false);
    setText("");
    current.current = "";
    pending.current = undefined;
    if (!identity) return;
    const key = draftKey(bindingId, identity);
    void Promise.all([LocalStorage.getItem<string>(key), LocalStorage.getItem<string>(`${key}:pending`)])
      .then(([value, raw]) => {
        const saved = raw === undefined ? undefined : JSON.parse(raw);
        if (
          raw !== undefined &&
          (!saved ||
            typeof saved !== "object" ||
            Array.isArray(saved) ||
            typeof saved.id !== "string" ||
            !/^[\w:.-]{1,200}$/.test(saved.id) ||
            typeof saved.generation !== "string" ||
            !/^[\w:.-]{1,200}$/.test(saved.generation) ||
            typeof saved.text !== "string" ||
            !saved.text.trim() ||
            saved.text.length > 100_000)
        )
          throw new Error("Invalid pending message");
        if (active) {
          pending.current = saved;
          current.current = value ?? saved?.text ?? "";
          setText(current.current);
          setReady(true);
        }
      })
      .catch(() => {
        if (active) {
          void showToast({
            style: Toast.Style.Failure,
            title: "Could not restore the local draft and pending message",
          });
        }
      });
    return () => {
      active = false;
    };
  }, [bindingId, identity]);
  const change = (value: string) => {
    if (!identity || !ready) return;
    current.current = value;
    setText(value);
    writes.current = writes.current
      .then(() =>
        value
          ? LocalStorage.setItem(draftKey(bindingId, identity), value)
          : LocalStorage.removeItem(draftKey(bindingId, identity)),
      )
      .catch(() => showToast({ style: Toast.Style.Failure, title: "Could not save the local draft" }));
  };
  const prepare = async (value: string, generation: string) => {
    if (!identity || !ready) throw new Error("Wait for your local draft to restore before sending.");
    if (pending.current && pending.current.text !== value)
      throw new Error(
        "The previous message's delivery is unknown. Retry its original text before sending a different message.",
      );
    if (pending.current && pending.current.generation !== generation)
      throw new Error(
        "The Agent session changed while message delivery was unknown. Check the original Agent before retrying.",
      );
    const attempt = pending.current ?? { id: randomUUID(), text: value, generation };
    await writes.current;
    // Save before network I/O, so closing Raycast cannot turn an ambiguous retry into a new execution.
    await LocalStorage.setItem(`${draftKey(bindingId, identity)}:pending`, JSON.stringify(attempt));
    pending.current = attempt;
    return attempt;
  };
  const clearIf = async (sent: string) => {
    if (!identity) return;
    const key = draftKey(bindingId, identity);
    const clearText = current.current === sent;
    if (clearText) {
      current.current = "";
      setText("");
    }
    writes.current = writes.current
      .then(async () => {
        // Clear the text first: a crash must never leave an old draft without its retry ID.
        if (clearText) await LocalStorage.removeItem(key);
        if (pending.current?.text === sent) {
          await LocalStorage.removeItem(`${key}:pending`);
          pending.current = undefined;
        }
      })
      .catch(() =>
        showToast({ style: Toast.Style.Failure, title: "Could not clear the sent draft; its retry ID is kept" }),
      );
    await writes.current;
  };
  const reject = async (messageId: string) => {
    if (!identity) return;
    const key = `${draftKey(bindingId, identity)}:pending`;
    const removal = writes.current.then(async () => {
      if (pending.current?.id !== messageId) return;
      await LocalStorage.removeItem(key);
      pending.current = undefined;
    });
    // Keep subsequent writes usable, but report this failure without dropping the retry ID.
    writes.current = removal.catch(() => undefined);
    await removal;
  };
  return { text, change, clearIf, prepare, reject, ready };
}
