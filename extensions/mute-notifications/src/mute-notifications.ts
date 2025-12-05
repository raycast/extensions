import { closeMainWindow, showHUD } from "@raycast/api";
import { execSync } from "child_process";
import { resolve } from "path";
import { existsSync } from "fs";

export default async function Command() {
  try {
    const exePath = resolve(__dirname, "./assets/toggle-focus-assist.exe");

    if (!existsSync(exePath)) {
      await showHUD(`❌ Not found at ${exePath} - compile the AutoHotkey script first`);
      return;
    }

    execSync(`cmd /c "${exePath}"`, { windowsHide: true });

    await closeMainWindow();
    await showHUD("🔔 Do Not Disturb toggled");
  } catch (error) {
    console.error("Error:", error);
    await showHUD("❌ Failed to toggle Do Not Disturb");
  }
}
