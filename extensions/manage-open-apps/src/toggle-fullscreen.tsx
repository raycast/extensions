import { runAppleScript } from "run-applescript";

import { toggleFrontmostApplicationFullscreenAppleScript } from "./lib/apple-scripts";
import { showFailureToast } from "@raycast/utils";

export default async function Command() {
  try {
    await runAppleScript(toggleFrontmostApplicationFullscreenAppleScript());
  } catch (e) {
    await showFailureToast("Failed to toggle fullscreen");
  }
}
