import { useCallback, useEffect, useRef, useState } from "react";
import { getState } from "../blip/client";
import type { BlipState } from "../blip/client";
import { BlipTimeoutError, BlipUnavailableError } from "../blip/errors";
import { demoState } from "../blip/demo";
import { openBlip } from "../platform";

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
          // A long poll that runs out of time simply means nothing changed.
          if (!(err instanceof BlipTimeoutError)) {
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

/**
 * Launches Blip in the background and waits for it to answer.
 *
 * Asking for state is the only honest readiness test. On Windows the socket file
 * outlives the app, so its presence says nothing about whether Blip is hosting.
 */
export async function launchBlip(timeoutMs = 15_000): Promise<boolean> {
  await openBlip(true);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await getState(undefined, 2_000);
      return true;
    } catch {
      // Blip is still starting up.
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  return false;
}
