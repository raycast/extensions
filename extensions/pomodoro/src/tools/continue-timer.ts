import { getCurrentInterval, isPaused } from "../lib/intervals";
import { continueTimer } from "../lib/timer";

export default async function () {
  const currentInterval = getCurrentInterval();
  if (!currentInterval) {
    return "No active timer";
  }
  if (!isPaused(currentInterval)) {
    return "Timer is not paused";
  }
  await continueTimer();
  return "Timer continued";
}
