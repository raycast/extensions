import { getCurrentInterval } from "../lib/intervals";
import { stopTimer } from "../lib/timer";

export default async function () {
  const currentInterval = getCurrentInterval();
  if (!currentInterval) {
    return "No active timer";
  }
  await stopTimer();
  return "Timer stopped";
}
