import { useEffect, useState } from "react";
import { DOTS_FRAMES, DOTS_PERIOD_MS } from "./dots";

/**
 * Frame counter for animated indicators. Advances `frames` times per `periodMs` while `active`,
 * and sits at 0 otherwise so nothing re-renders when no pane is working.
 */
export function useWorkingFrame(active: boolean, periodMs = DOTS_PERIOD_MS, frames = DOTS_FRAMES): number {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    if (!active) {
      setFrame(0);
      return;
    }
    const interval = Math.max(50, periodMs / frames);
    const timer = setInterval(() => setFrame((f) => (f + 1) % frames), interval);
    return () => clearInterval(timer);
  }, [active, periodMs, frames]);
  return active ? frame : 0;
}
