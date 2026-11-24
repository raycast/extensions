import { showHUD } from "@raycast/api";
import { stopTimer, tick } from "./lib/engine";
import { getTimer } from "./lib/storage";

export default async function Command() {
  await tick();
  if (!(await getTimer())) {
    await showHUD("No Raycast timer is running. Blocks started on the website stop there.");
    return;
  }
  const stopped = await stopTimer();
  await showHUD(stopped?.phase === "focus" ? "Block stopped. It was not saved." : "Break stopped");
}
