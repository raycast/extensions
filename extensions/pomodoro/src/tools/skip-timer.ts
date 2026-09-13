import { IntervalTitles } from "../lib/constants";
import { getCurrentInterval } from "../lib/intervals";
import { skipTimer } from "../lib/timer";

export default async function () {
  const currentInterval = getCurrentInterval();
  if (!currentInterval) {
    return "No active timer";
  }

  const nextInterval = await skipTimer();
  return nextInterval ? `Skipped to ${IntervalTitles[nextInterval.type]}` : "No active timer";
}
