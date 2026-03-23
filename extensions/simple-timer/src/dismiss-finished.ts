import { showHUD } from "@raycast/api";
import { getDoneTimers, dismissTimer } from "./timer-state";
import { stopAlertSound } from "./sound";

export default async function Command() {
  const done = getDoneTimers();
  if (!done.length) {
    await showHUD("No finished timers to dismiss");
    return;
  }
  for (const t of done) {
    stopAlertSound(t.id);
    await dismissTimer(t.id);
  }
  await showHUD(`✅ ${done.length} timer${done.length > 1 ? "s" : ""} dismissed`);
}
