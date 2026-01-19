import { showHUD } from "@raycast/api";
import { runAppleScript, showFailureToast } from "@raycast/utils";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const isWin = process.platform === "win32";
const execp = promisify(exec);

export default async function Command() {
  try {
    const appleScript = `
    tell application "Terminal"
      do script "python3"
    end tell
    `;

    const powerShellScript = `start wt.exe pwsh -NoExit -Command python`;

    if (isWin) {
      await execp(powerShellScript);
    } else {
      await runAppleScript(appleScript);
    }

    await showHUD("Python interpretor opened in terminal");
  } catch {
    showFailureToast("Failed to open python interpretor in terminal");
  }
}
