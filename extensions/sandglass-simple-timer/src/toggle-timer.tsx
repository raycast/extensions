import { showHUD } from "@raycast/api";
import { formatClock, formatTimeOfDay } from "./lib/format.ts";
import { getRemainingMs } from "./lib/state.ts";
import { currentTimer, loadState, pauseCurrent, resumeCurrent } from "./lib/timer-service.ts";

export default async function Command() {
  const timer = currentTimer(loadState());
  if (!timer) return showHUD("No timer running");

  if (timer.status === "running") {
    const paused = currentTimer(pauseCurrent());
    return showHUD(`⏸ Paused · ${formatClock(paused ? getRemainingMs(paused, Date.now()) : 0)} left`);
  }
  if (timer.status === "paused") {
    const resumed = currentTimer(resumeCurrent());
    return showHUD(`▶ Resumed · ends at ${formatTimeOfDay(resumed?.endsAt ?? Date.now())}`);
  }
  return showHUD("Time's up — start a new timer with Start Timer");
}
