import { useEffect, useRef, useState } from "react";
import { watchDisplayChanges } from "./keito/timing";

/** Advance running displays locally and reconcile timers changed in Keito at least once a minute. */
export function useTimerClock(running: boolean, revalidate: () => void, displayKey: (now: number) => string): number {
  const [now, setNow] = useState(Date.now);
  const displayKeyRef = useRef(displayKey);

  useEffect(() => {
    displayKeyRef.current = displayKey;
  }, [displayKey]);

  useEffect(() => {
    if (!running) return;
    return watchDisplayChanges(
      () => displayKeyRef.current(Date.now()),
      () => setNow(Date.now()),
    );
  }, [running]);

  useEffect(() => {
    const refresh = setInterval(revalidate, 60_000);
    return () => clearInterval(refresh);
  }, [revalidate]);

  // New API data may arrive before the first clock tick, or after a long inactive period.
  return Math.max(now, Date.now());
}
