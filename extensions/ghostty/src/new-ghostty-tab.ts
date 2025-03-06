import { runAppleScript } from "run-applescript";
import { popToRoot } from "@raycast/api";
import { openGhosttyTab } from "./utils/scripts";

export default async function Command() {
  await runAppleScript(openGhosttyTab);
  await popToRoot();
}
