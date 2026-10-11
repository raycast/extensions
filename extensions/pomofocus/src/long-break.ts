import { showHUD } from "@raycast/api";
import { startTimer } from "./lib/actions";
import { DURATIONS } from "./lib/timer";

export default async function Command() {
  await showHUD("Long break started · 15:00");
  await startTimer("long-break", DURATIONS["long-break"]);
}
