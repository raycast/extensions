import { getCurrentInterval, isPaused } from "../lib/intervals";
import { pauseTimer } from "../lib/timer";

export default async function () {
  const currentInterval = getCurrentInterval();
  if (!currentInterval) {
    return "No active timer";
  }
  if (isPaused(currentInterval)) {
    return "Timer is already paused";
  }
  await pauseTimer();
  return "Timer paused";
}
