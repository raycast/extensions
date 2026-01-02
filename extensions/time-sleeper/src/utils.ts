import { showHUD } from "@raycast/api";
import { execSync } from "child_process";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sleepWithCountdown(seconds: number): Promise<void> {
  for (let i = seconds; i > 0; i--) {
    await showHUD(`😴 Sleeping in ${i}...`);
    await sleep(1000);
  }

  execSync("osascript -e 'tell application \"Finder\" to sleep'");
}
