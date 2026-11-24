import { showHUD } from "@raycast/api";
import { breakMinutes, startBreak, tick } from "./lib/engine";
import { getPendingBreak } from "./lib/storage";
import { formatMinutes } from "./lib/timer";

export default async function Command() {
  await tick();
  const minutes = (await getPendingBreak())?.minutes ?? breakMinutes();
  await startBreak(minutes);
  await showHUD(`Break started · ${formatMinutes(minutes)}`);
}
