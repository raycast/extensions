import { useCallback, useEffect, useRef, useState } from "react";
import { readConnectionState, readStatus } from "../lib/pia";
import { ConnectionState, VpnStatus } from "../types";

const POLL_INTERVAL_MS = 2000;
/** Refresh the full detail set every Nth poll even if the state looks static. */
const DETAIL_REFRESH_EVERY = 5;

// Before the first read completes nothing is known — starting at
// "Disconnected" would flash a confident wrong state on every launch.
const EMPTY: VpnStatus = { state: "Unknown" };

/**
 * Each `piactl get` is its own subprocess, so reading every field on every tick
 * would spawn six processes a second or two. The connection state is the only
 * value that needs to be live, so poll that alone and pull the rest when it
 * changes — plus periodically, since fields like the forwarded port can settle
 * while the state stays "Connected".
 */
export function useStatus(cliPath: string | undefined) {
  const [status, setStatus] = useState<VpnStatus>(EMPTY);
  const [isLoading, setIsLoading] = useState(true);
  const inFlight = useRef(false);
  const lastState = useRef<ConnectionState | undefined>(undefined);
  const tick = useRef(0);

  const refresh = useCallback(
    async (force = false) => {
      if (!cliPath || inFlight.current) return;
      inFlight.current = true;
      try {
        const state = await readConnectionState(cliPath);
        const changed = state !== lastState.current;
        const periodic = tick.current % DETAIL_REFRESH_EVERY === 0;
        tick.current += 1;
        lastState.current = state;

        if (force || changed || periodic) {
          setStatus(await readStatus(cliPath));
        } else {
          setStatus((prev) =>
            prev.state === state ? prev : { ...prev, state },
          );
        }
      } finally {
        setIsLoading(false);
        inFlight.current = false;
      }
    },
    [cliPath],
  );

  useEffect(() => {
    if (!cliPath) return;
    void refresh(true);
    const id = setInterval(() => void refresh(), POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [refresh, cliPath]);

  return { status, isLoading, refresh };
}
