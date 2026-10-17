import { showHUD } from "@raycast/api";
import { onekoRunning, send } from "./oneko";

export default async function command() {
  // Guard so oneko://quit can't launch the app just to quit it.
  if (!(await onekoRunning())) {
    await showHUD("Oneko is not running");
    return;
  }
  if (!(await send("quit"))) return;
  await showHUD("Oneko quit");
}
