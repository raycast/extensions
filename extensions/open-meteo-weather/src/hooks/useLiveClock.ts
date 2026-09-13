import { useEffect, useRef, useState } from "react";

/**
 * Keeps long-open views on the live clock: the returned tick bumps every
 * minute (use it as a dependency for anything derived from "now"), and
 * `refresh` is called every 15 minutes to refetch remote data.
 */
export function useLiveClock(refresh: () => void): number {
  const [tick, setTick] = useState(0);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (tick > 0 && tick % 15 === 0) refreshRef.current();
  }, [tick]);

  return tick;
}
