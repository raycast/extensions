import { showHUD } from "@raycast/api";
import { execSync } from "child_process";
import { stopAll } from "./lib/playback-controller";

export default async function StopAllCommand() {
  await stopAll();

  // Kill any orphaned looper processes as a safety net
  try {
    execSync("killall looper 2>/dev/null");
  } catch {
    // No processes to kill
  }

  await showHUD("All sounds stopped");
}
