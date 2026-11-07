import { showHUD } from "@raycast/api";
import { startTimer } from "./lib/actions";
import { DURATIONS } from "./lib/timer";

export default async function Command() {
  await showHUD("Break started · 05:00");
  await startTimer("break", DURATIONS.break);
}
