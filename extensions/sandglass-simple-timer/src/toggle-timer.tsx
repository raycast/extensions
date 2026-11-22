import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { formatClock, formatTimeOfDay } from "./lib/format.ts";
import { getRemainingMs } from "./lib/state.ts";
import { currentTimer, loadState, pauseCurrent, resumeCurrent } from "./lib/timer-service.ts";

export default async function Command() {
  try {
    const timer = currentTimer(loadState());
    if (!timer) return await showHUD("No timer running");

    if (timer.status === "running") {
      const paused = currentTimer(pauseCurrent());
      return await showHUD(`⏸ Paused · ${formatClock(paused ? getRemainingMs(paused, Date.now()) : 0)} left`);
    }
    if (timer.status === "paused") {
      const resumed = currentTimer(resumeCurrent());
      return await showHUD(`▶ Resumed · ends at ${formatTimeOfDay(resumed?.endsAt ?? Date.now())}`);
    }
    return await showHUD("Time's up — start a new timer with Start Timer");
  } catch (error) {
    await showFailureToast(error, { title: "Couldn't pause or resume the timer" });
  }
}
