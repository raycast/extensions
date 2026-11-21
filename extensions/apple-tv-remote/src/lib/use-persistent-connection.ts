import { useCallback, useEffect, useRef, useState } from "react";
import { AppleTVConnection, disconnect, onConnectionLost } from "@bharper/atv-js";
import { ACTIONS } from "./actions";
import { openConnection } from "./connection";
import { NotPairedError, showErrorToast } from "./errors";

export type ConnectionStatus = "connecting" | "connected" | "disconnected" | "not-paired";

/**
 * One live Companion connection for the lifetime of a view, so every press
 * is instant. Like the iPhone remote, connecting wakes the Apple TV. Opens on
 * mount, tears down on unmount, tracks drops, and coalesces concurrent open
 * attempts: `openConnection` can take up to its timeout, and without
 * coalescing every key pressed in that window would open another socket.
 */
export function usePersistentConnection() {
  const connRef = useRef<AppleTVConnection | null>(null);
  // The connection attempt in flight, shared by every caller.
  const establishingRef = useRef<Promise<AppleTVConnection | null> | null>(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [deviceName, setDeviceName] = useState("Apple TV");

  const connect = useCallback((): Promise<AppleTVConnection | null> => {
    establishingRef.current ??= (async () => {
      // Retire the old connection first (only non-null on a manual reconnect),
      // so no action keeps using a socket that is about to drop.
      const previous = connRef.current;
      connRef.current = null;
      if (previous) disconnect(previous);
      setStatus("connecting");

      try {
        const conn = await openConnection();
        if (!mountedRef.current) {
          disconnect(conn);
          return null;
        }
        connRef.current = conn;
        setDeviceName(conn.device.name);
        setStatus("connected");
        void ACTIONS.wake.run(conn).catch(() => {});
        onConnectionLost(conn, () => {
          // Ignore drops of replaced connections, including the one our own disconnect triggers.
          if (connRef.current !== conn) return;
          connRef.current = null;
          setStatus("disconnected");
        });
        return conn;
      } catch (error) {
        if (mountedRef.current) {
          setStatus(error instanceof NotPairedError ? "not-paired" : "disconnected");
          await showErrorToast(error);
        }
        return null;
      } finally {
        establishingRef.current = null;
      }
    })();
    return establishingRef.current;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void connect();
    return () => {
      mountedRef.current = false;
      // Null the ref first so the lost-callback's identity check ignores our own disconnect.
      const conn = connRef.current;
      connRef.current = null;
      if (conn) disconnect(conn);
    };
  }, [connect]);

  /** Run an action on the live connection, opening one if needed. Failures become toasts; returns whether it ran. */
  const run = useCallback(
    async (action: (conn: AppleTVConnection) => Promise<void>): Promise<boolean> => {
      const conn = connRef.current ?? (await connect());
      if (!conn) return false;
      try {
        await action(conn);
        return true;
      } catch (error) {
        await showErrorToast(error);
        return false;
      }
    },
    [connect],
  );

  return { status, deviceName, run, reconnect: connect };
}
