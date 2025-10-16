import { runAppleScript } from "run-applescript";
import { openGhosttyWindowAtFinderLocation } from "./utils/scripts";

export default async function Command() {
  await runAppleScript(openGhosttyWindowAtFinderLocation);
}
