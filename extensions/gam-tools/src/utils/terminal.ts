import { getPreferenceValues } from "@raycast/api";
import { exec } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function runCommandInTerminal(commandArgs: string): Promise<void> {
  const preferences = getPreferenceValues<ExtensionPreferences>(); //<Preferences.GamTools>();
  const gamPath = preferences?.gamPath?.trim() || "gam";

  // Build the script file path
  const tmpDir = os.tmpdir();
  const scriptPath = path.join(tmpDir, "raycast_gam_exec.sh");

  // Construct full script content
  // Environment PATH ensures GAM dependencies (python/openssl) resolve correctly
  const scriptContent = `#!/usr/bin/env zsh
export PATH="$PATH:/usr/local/bin:/opt/homebrew/bin:$HOME/bin/gam"
"${gamPath}" ${commandArgs}
`;

  // Write script and mark as executable (chmod +x)
  fs.writeFileSync(scriptPath, scriptContent, { mode: 0o755 });

  // Launch terminal targeting the script file directly
  const appleScript = `
    tell application "Terminal"
      activate
      do script "${scriptPath}"
    end tell
  `;

  await execAsync(`osascript -e '${appleScript}'`);
}
