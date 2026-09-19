import { useCallback, useEffect, useRef, useState } from "react";
import { execFile } from "node:child_process";
import { getState } from "../blip/client";
import type { BlipState } from "../blip/client";
import { BlipUnavailableError, socketExists } from "../blip/drpc";
import { demoState } from "../blip/demo";

const LONG_POLL_MS = 20_000;
const RETRY_MS = 2_000;

export interface BlipStateHook {
  state?: BlipState;
  error?: Error;
  isLoading: boolean;
  unavailable: boolean;
  /** Fetch a fresh snapshot right away (after dispatching an event, for example). */
  refresh: () => Promise<void>;
}

/**
 * Keeps a live copy of Blip's state. The first call returns immediately; later
 * calls long-poll so the UI updates the moment Blip changes anything.
 */
export function useBlipState(): BlipStateHook {
  const [state, setState] = useState<BlipState>();
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(true);
  const lastId = useRef<number | undefined>(undefined);
  const alive = useRef(true);
  const generation = useRef(0);

  const apply = useCallback((id: number, next: BlipState) => {
    lastId.current = id;
    setState(next);
    setError(undefined);
    setIsLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const snapshot = await getState(undefined, 5_000);
      if (alive.current) apply(snapshot.id, snapshot.state);
    } catch (e) {
      if (alive.current) {
        setError(e as Error);
        setIsLoading(false);
      }
    }
  }, [apply]);

  useEffect(() => {
    alive.current = true;
    const myGeneration = ++generation.current;
    const demo = demoState();
    if (demo) {
      apply(0, demo);
      return () => {
        alive.current = false;
      };
    }

    const loop = async () => {
      while (alive.current && generation.current === myGeneration) {
        try {
          const snapshot = await getState(lastId.current, lastId.current === undefined ? 5_000 : LONG_POLL_MS);
          if (!alive.current || generation.current !== myGeneration) return;
          apply(snapshot.id, snapshot.state);
        } catch (e) {
          if (!alive.current || generation.current !== myGeneration) return;
          const err = e as Error;
          // A long poll that times out simply means nothing changed.
          const timedOut = err.name === "BlipRpcError" && /did not answer/.test(err.message);
          if (!timedOut) {
            setError(err);
            setIsLoading(false);
            if (err instanceof BlipUnavailableError) lastId.current = undefined;
            await new Promise((r) => setTimeout(r, RETRY_MS));
          }
        }
      }
    };
    void loop();

    return () => {
      alive.current = false;
    };
  }, [apply]);

  return {
    state,
    error,
    isLoading,
    unavailable: error instanceof BlipUnavailableError,
    refresh,
  };
}

/** Launches Blip in the background and waits for its socket to come up. */
export async function launchBlip(timeoutMs = 15_000): Promise<boolean> {
  await new Promise<void>((resolve, reject) => {
    execFile("open", ["-g", "-b", "net.blip.macos"], (err) => (err ? reject(err) : resolve()));
  });
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (socketExists()) {
      try {
        await getState(undefined, 2_000);
        return true;
      } catch {
        // not ready yet
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
