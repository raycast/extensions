import { showHUD } from "@raycast/api";
import { onekoRunning, readSetting, requireOneko, send } from "./oneko";

export default async function command() {
  if (!(await requireOneko())) return;
  if (!(await onekoRunning())) {
    await send("show");
    await showHUD("Oneko started");
    return;
  }
  // catHidden reflects the state before the toggle; absent means shown.
  const hidden = (await readSetting("catHidden")) === "1";
  await send("toggle");
  await showHUD(hidden ? "Cat shown" : "Cat hidden");
}
