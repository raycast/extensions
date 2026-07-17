import { closeMainWindow, showHUD } from "@raycast/api";
import { appExists, appReady } from "./connector";
import { execSync, execFileSync } from "child_process";

export default async function Command() {
  if (!appExists()) {
    await showHUD("KDE Connect is not installed");
    return;
  }

  // Close Raycast so it doesn't fight for focus
  await closeMainWindow({ clearRootSearch: true });

  try {
    // If KDE Connect isn't running yet, launch it first and wait
    if (!(await appReady())) {
      execSync('open -a "/Applications/KDE Connect.app"');
      // Wait for it to be ready
      for (let i = 0; i < 10; i++) {
        if (await appReady()) break;
        execSync("sleep 0.5");
      }
    }

    // Use execFileSync to avoid all shell escaping issues
    // Each -e argument is passed cleanly as a separate array element
    execFileSync(
      "osascript",
      [
        "-e",
        'tell application "System Events"',
        "-e",
        '  tell process "KDE Connect"',
        "-e",
        "    click menu bar item 1 of menu bar 2",
        "-e",
        "    delay 0.3",
        "-e",
        '    click menu item "Open app" of menu 1 of menu bar item 1 of menu bar 2',
        "-e",
        "  end tell",
        "-e",
        "end tell",
      ],
      { timeout: 10000 }
    );
  } catch (error) {
    await showHUD("Failed to open KDE Connect: " + String(error));
  }
}
