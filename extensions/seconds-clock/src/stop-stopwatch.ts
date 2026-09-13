import { showHUD } from "@raycast/api";

import { stopStopwatch } from "./lib/activity";

export default async function Command() {
  const wasRunning = await stopStopwatch();

  if (!wasRunning) {
    await showHUD("No Stopwatch Running");
    return;
  }

  await showHUD("Stopwatch Stopped");
}
