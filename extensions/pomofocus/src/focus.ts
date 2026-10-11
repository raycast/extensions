import { showHUD } from "@raycast/api";
import { startTimer } from "./lib/actions";
import { DURATIONS } from "./lib/timer";

export default async function Command() {
  await showHUD("Focus started · 25:00");
  await startTimer("focus", DURATIONS.focus);
}
