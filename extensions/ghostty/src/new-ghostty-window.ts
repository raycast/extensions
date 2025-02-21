import { runAppleScript } from "run-applescript";
import { popToRoot } from "@raycast/api";
import { openGhosttyWindow } from "./utils/scripts";

export default async function Command() {
  await runAppleScript(openGhosttyWindow);
  await popToRoot();
}
