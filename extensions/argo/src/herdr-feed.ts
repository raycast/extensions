import { getPreferenceValues } from "@raycast/api";
import { useCallback, useEffect, useRef, useState } from "react";
import { HcClient, hcEntries, type HcEntry } from "./herdr.js";

export function useHerdr() {
  const [entries, setEntries] = useState<HcEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [name, setName] = useState("Herdr");
  const [attempt, setAttempt] = useState(0);
  const { hcSocketPath } = getPreferenceValues<{ hcSocketPath?: string }>();
  const stop = useRef<() => void>(() => {});
  const reconnect = useCallback(() => {
    stop.current();
    setAttempt((n) => n + 1);
  }, []);
  useEffect(() => {
    let active = true,
      client: HcClient | undefined,
      unsubscribe: (() => void) | undefined;
    let disconnected = false;
    let pending = false,
      again = false;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const fail = (cause: unknown) => {
      if (!active) return;
      setError(cause instanceof Error ? cause.message : "Herdr is unavailable. Reconnect to refresh.");
      setEntries((current) => current.map((entry) => ({ ...entry, connected: false })));
      setLoading(false);
    };
    async function refresh() {
      if (!active || !client || disconnected) return;
      if (pending) {
        again = true;
        return;
      }
      pending = true;
      try {
        do {
          again = false;
          const catalogue = await client.catalogue();
          if (!active || disconnected) return;
          setName(catalogue.core.name || "Herdr");
          setEntries(hcEntries(catalogue, client.socketPath));
          setError(undefined);
          setLoading(false);
        } while (again && active);
      } catch (cause) {
        fail(cause);
      } finally {
        pending = false;
      }
    }
    const changed = () => {
      if (!active || debounce) return;
      debounce = setTimeout(() => {
        debounce = undefined;
        void refresh();
      }, 200);
    };
    setLoading(true);
    setError(undefined);
    void (async () => {
      try {
        const connected = await HcClient.connect(hcSocketPath);
        if (!active) {
          connected.close();
          return;
        }
        client = connected;
        unsubscribe = await client.observe(changed, (cause) => {
          disconnected = true;
          fail(cause);
          client?.close();
          // A fresh handshake is required; never keep a disconnected observation alive.
          if (active && !retry) retry = setTimeout(reconnect, 5000);
        });
        if (!active) {
          unsubscribe();
          connected.close();
          return;
        }
        await refresh();
      } catch (cause) {
        client?.close();
        fail(cause);
      }
    })();
    const timer = setInterval(() => {
      void refresh();
    }, 15_000);
    const cleanup = () => {
      active = false;
      clearInterval(timer);
      if (debounce) clearTimeout(debounce);
      if (retry) clearTimeout(retry);
      unsubscribe?.();
      client?.close();
    };
    stop.current = cleanup;
    return cleanup;
  }, [hcSocketPath, attempt, reconnect]);
  return { entries, loading, error, name, reconnect };
}

export { hcStatus, hcGroup } from "./session-target.js";
