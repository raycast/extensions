import { showHUD } from "@raycast/api";
import { formatDuration, getDuration, stopTimer } from "./Timers";

export default async function Command() {
  const timer = await stopTimer();

  if (timer === null) {
    await showHUD("No timer running");
    return;
  }

  await showHUD(`Stopped ${timer.name}: ${formatDuration(getDuration(timer))}`);
}
