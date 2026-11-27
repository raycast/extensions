import { useEffect, useState } from "react";
import { currentTimer, loadState } from "../lib/timer-service.ts";
import type { SandglassState } from "../lib/types.ts";

/**
 * State for one screen plus a clock that ticks every second. When the running timer reaches its end, the state is
 * reloaded so the timer shows as finished. Each screen (root or pushed) keeps its own copy, because a pushed view
 * doesn't receive its parent's updates.
 */
export function useLiveState(initial: SandglassState | (() => SandglassState)) {
  const [state, setState] = useState(initial);
  const [now, setNow] = useState(Date.now);

  useEffect(() => {
    const id = setInterval(() => {
      const tick = Date.now();
      setNow(tick);
      setState((current) => {
        const timer = currentTimer(current);
        return timer?.status === "running" && timer.endsAt <= tick ? loadState() : current;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return { state, setState, now };
}
