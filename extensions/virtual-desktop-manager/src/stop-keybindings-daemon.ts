import { showHUD, showToast, Toast } from "@raycast/api";
import { isKeybindingsRunning, killKeybindingsScript } from "./lib/ahk-utils";

export default async function main() {
  const isRunning = await isKeybindingsRunning();

  if (!isRunning) {
    await showHUD("Daemon is not running");
    return;
  }

  await killKeybindingsScript();

  const stillRunning = await isKeybindingsRunning();

  if (!stillRunning) {
    await showHUD("Keybindings daemon stopped");
  } else {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to stop daemon",
    });
  }
}
