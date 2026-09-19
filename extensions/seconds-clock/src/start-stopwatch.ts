import { showHUD } from "@raycast/api";

import { startStopwatch } from "./lib/activity";

export default async function Command() {
  await startStopwatch();
  await showHUD("Stopwatch Started");
}
