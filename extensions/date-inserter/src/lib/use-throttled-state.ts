import { useEffect, useState } from "react";
import { HoldOptions, UpdateScheduler } from "./update-scheduler";

/**
 * State whose changes apply immediately but reach the screen only as often as
 * Raycast can keep up with; see `UpdateScheduler`. Every new value goes through
 * `normalize`, e.g. to keep it within the supported date range.
 */
export function useThrottledState<T>(initial: T, normalize: (value: T) => T = (value) => value) {
  const [shown, setShown] = useState(initial);
  const [scheduler] = useState(() => new UpdateScheduler(initial, setShown));
  useEffect(() => () => scheduler.dispose(), [scheduler]);

  const update = (next: (current: T) => T, hold?: HoldOptions<T>) =>
    scheduler.update((current) => normalize(next(current)), hold);
  // Confirming actions read the latest value, which may not be on screen yet.
  const settle = () => scheduler.settle();
  return [shown, update, settle] as const;
}
