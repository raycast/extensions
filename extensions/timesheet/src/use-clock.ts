import { useEffect, useState } from "react";

/** Re-renders every `intervalMs` while `active`, so a running duration keeps counting. */
export function useClock(active: boolean, intervalMs = 10000): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setTick((tick) => tick + 1), intervalMs);
    return () => clearInterval(id);
  }, [active, intervalMs]);
}
