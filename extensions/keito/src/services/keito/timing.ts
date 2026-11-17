import type { TimeEntry } from "./types";

type TimerDuration = Pick<TimeEntry, "hours" | "durationSeconds" | "isRunning" | "timerStartedAt">;

/** Keito returns saved seconds; the current running segment is not included, even on reads. */
export function entryHours(entry: TimerDuration, now: number): number {
  const savedSeconds = entry.durationSeconds ?? entry.hours * 3600;
  const startedAt = Date.parse(entry.timerStartedAt ?? "");
  const elapsedSeconds =
    entry.isRunning && Number.isFinite(startedAt) ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0;
  return (savedSeconds + elapsedSeconds) / 3600;
}

/** Raycast warns about repeated renders with unchanged output, so only publish visible changes. */
export function watchDisplayChanges(displayKey: () => string, onChange: () => void): () => void {
  let previous = displayKey();
  const timer = setInterval(() => {
    const next = displayKey();
    if (next === previous) return;
    previous = next;
    onChange();
  }, 1000);
  return () => clearInterval(timer);
}
