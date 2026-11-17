import { useEffect, useState } from "react";
import { applyBlipPreferences } from "../lib/apply-preferences";
import { getClient, type StateSnapshot } from "../lib/client";
import { DrpcTimeoutError } from "../lib/drpc";

const LONG_POLL_MS = 25000;

/**
 * Live Blip state. Uses GetState's long-poll, so updates arrive as soon as Blip's state changes
 * (new devices coming online, transfer progress, search results) without busy polling.
 */
export function useBlipState() {
  const [snapshot, setSnapshot] = useState<StateSnapshot>();
  const [error, setError] = useState<Error>();

  useEffect(() => {
    const controller = new AbortController();
    const client = getClient();
    let lastId: string | undefined;

    (async () => {
      while (!controller.signal.aborted) {
        try {
          const next = await client.getState({
            lastId,
            timeoutMs: lastId ? LONG_POLL_MS : 15000,
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          lastId = next.id;
          setSnapshot(next);
          if (next.state.config) applyBlipPreferences(next.state.config).catch(() => {});
          setError(undefined);
        } catch (e) {
          if (controller.signal.aborted) return;
          if (e instanceof DrpcTimeoutError && lastId) continue; // Nothing changed; poll again.
          setError(e instanceof Error ? e : new Error(String(e)));
          lastId = undefined;
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }
    })();

    return () => controller.abort();
  }, []);

  return { state: snapshot?.state, isLoading: !snapshot && !error, error };
}
