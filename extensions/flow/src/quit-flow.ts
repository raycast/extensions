import { runAppleScript } from "run-applescript";
import { showHUD } from "@raycast/api";

export default async function quitFlow() {
  await runAppleScript("tell application \"Flow\" to quit");
  await showHUD("Flow has been closed");
}
