import { showHUD, popToRoot } from "@raycast/api";
import { run } from "./utils/run";

export default async function Command() {
  // Kill explorer.exe silently
  run("taskkill", ["/f", "/im", "explorer.exe"], undefined, false);

  // Wait a moment before restarting
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Start explorer.exe
  run("explorer.exe", [], undefined, false);

  await showHUD("Windows Explorer restarted");
  await popToRoot();
}
