import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const execAsync = promisify(exec);

export default async function main() {
  try {
    const tempDir = os.tmpdir();
    const scriptPath = path.join(tempDir, `create-tab-${Date.now()}.ps1`);

    const psScript = `$wshell = New-Object -ComObject wscript.shell
$proc = Get-Process chrome -ErrorAction SilentlyContinue | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object -First 1
if ($proc) {
  Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class Win { [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd); }' -ErrorAction SilentlyContinue
  [Win]::SetForegroundWindow($proc.MainWindowHandle) | Out-Null
  $wshell.SendKeys('^t')
} else {
  $wshell.SendKeys('^t')
}`;

    fs.writeFileSync(scriptPath, psScript);

    // Execute and wait briefly, but show HUD immediately for perceived speed
    const executionPromise = execAsync(`powershell -ExecutionPolicy Bypass -File "${scriptPath}"`);
    await showHUD("New tab created");

    // Wait for execution in background, then clean up
    executionPromise
      .then(() => {
        try {
          fs.unlinkSync(scriptPath);
        } catch {
          // Ignore cleanup errors
        }
      })
      .catch(() => {
        // Ignore errors, tab creation might still work
        try {
          fs.unlinkSync(scriptPath);
        } catch {
          // Ignore cleanup errors
        }
      });
  } catch (error) {
    await showHUD("Failed to create tab");
    console.error("Error creating tab:", error);
  }
}
