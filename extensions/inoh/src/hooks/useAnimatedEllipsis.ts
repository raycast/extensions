import { useEffect, useState } from "react";

/**
 * How long each step of the cycle holds.
 *
 * Reason: slow enough to read as one thing growing rather than flickering,
 * fast enough that a two-second wait shows several steps. Mirrors the web
 * app's hook of the same name, so the two wait at the same rhythm.
 */
const STEP_MS = 400;

/** How many dots the run grows to before starting over. */
const MAX_DOTS = 3;

/**
 * A run of dots that grows and starts over: "." then ".." then "..." again.
 *
 * Reason: a wait that says nothing for two seconds reads as a window that has
 * stopped. Dots that move say the command is still working without claiming
 * to know how much longer it will take.
 *
 * Each step re-renders the form, so the caller must stop it the moment the
 * wait is over: a timer left running would keep re-rendering fields the user
 * is typing into for no reason.
 *
 * @param isRunning - Whether to keep cycling; it resets to one dot when not
 * @returns The dots to show right now
 */
export function useAnimatedEllipsis(isRunning: boolean): string {
  const [dotCount, setDotCount] = useState(1);

  useEffect(() => {
    if (!isRunning) {
      setDotCount(1);
      return;
    }

    const timer = setInterval(() => setDotCount((count) => (count % MAX_DOTS) + 1), STEP_MS);
    return () => clearInterval(timer);
  }, [isRunning]);

  return ".".repeat(dotCount);
}
