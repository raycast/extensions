import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Checks if GAM exists at the configured path or system PATH.
 */
export async function isGamInstalled(): Promise<boolean> {
  const preferences = getPreferenceValues<ExtensionPreferences>();
  const gamPath = preferences?.gamPath?.trim() || "gam";

  // Check if absolute file path exists
  if (path.isAbsolute(gamPath) && fs.existsSync(gamPath)) {
    return true;
  }

  // Fallback: check via `which` command in shell
  try {
    const homeDir = os.homedir();
    const systemPath = `${process.env.PATH || ""}:/usr/local/bin:/opt/homebrew/bin:${homeDir}/bin/gam`;
    await execAsync(`which "${gamPath}"`, { env: { ...process.env, PATH: systemPath } });
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens a Terminal window to run GAM's official installer script.
 */
export async function installGamInTerminal(): Promise<void> {
  const tmpDir = os.tmpdir();
  const scriptPath = path.join(tmpDir, "install_gam.sh");

  // GAMADV-XTD3 / Standard GAM official installation script runner
  const scriptContent = `#!/usr/bin/env zsh
echo "=== GAM Not Found: Starting Automated Installation ==="
echo ""
bash <(curl -s -S -L https://gam-shortn.appspot.com/gam-install)
echo ""
echo "=== Installation complete. Press Enter to close ==="
read
`;

  fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

  const appleScript = `
    tell application "Terminal"
      activate
      do script "${scriptPath}"
    end tell
  `;

  await execAsync(`osascript -e '${appleScript}'`);
}

/**
 * Ensures GAM is available before executing actions.
 * Returns true if available, or false if installation was launched.
 */
export async function ensureGamOrInstall(): Promise<boolean> {
  const installed = await isGamInstalled();

  if (!installed) {
    await showToast({
      style: Toast.Style.Failure,
      title: "GAM Not Installed",
      message: "Opening Terminal to install GAM...",
    });

    await installGamInTerminal();
    return false;
  }

  return true;
}
