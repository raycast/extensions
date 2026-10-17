import { environment, LaunchType, showHUD } from "@raycast/api";
import { pauseTimer, resumeTimer, settleExpired } from "./lib/actions";
import { loadState } from "./lib/store";
import { formatRemaining, remaining } from "./lib/timer";

/**
 * Run by the user: pauses a running timer or resumes a paused one.
 * Run by Raycast's background refresh (interval in package.json): only checks
 * whether the timer has ended and fires the notification.
 */
export default async function Command() {
  if (environment.launchType === LaunchType.Background) {
    await settleExpired();
    return;
  }

  const state = await loadState();
  if (state?.status === "running") {
    const paused = await pauseTimer();
    if (paused) {
      await showHUD(`Paused · ${formatRemaining(remaining(paused, Date.now()))} left`);
      return;
    }
  }
  if (state?.status === "paused") {
    const resumed = await resumeTimer();
    if (resumed) {
      await showHUD(`Resumed · ${formatRemaining(remaining(resumed, Date.now()))} left`);
      return;
    }
  }
  await showHUD("No timer to pause or resume");
}
