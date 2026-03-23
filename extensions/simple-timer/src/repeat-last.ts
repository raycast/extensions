import { showHUD, LocalStorage } from "@raycast/api";
import { startTimer } from "./timer-state";
import { formatLabel } from "./utils";

const RECENT_KEY = "recent-timers";

export default async function Command() {
  const raw = await LocalStorage.getItem<string>(RECENT_KEY);
  if (!raw) {
    await showHUD("No recent timer to repeat");
    return;
  }
  const recent: number[] = JSON.parse(raw);
  if (!recent.length) {
    await showHUD("No recent timer to repeat");
    return;
  }
  const seconds = recent[0];
  startTimer({
    totalSeconds: seconds,
    label: formatLabel(seconds),
    note: "",
    soundFile: "alert.wav",
    volume: 75,
    alertDuration: 0,
  });
  await showHUD(`▶ ${formatLabel(seconds)} started`);
}
