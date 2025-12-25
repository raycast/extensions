import { showHUD } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

async function terminateProcesses() {
  let anySuccess = false;
  const methods = [
    // Method 1: taskkill for Chrome/Helium
    "taskkill /IM chrome.exe /IM helium.exe /F",

    // Method 2: PowerShell Stop-Process
    'powershell -Command "Get-Process chrome,helium | Stop-Process -Force"',

    // Method 3: Native WM_CLOSE for graceful closing
    // eslint-disable-next-line no-useless-escape
    'powershell -Command "Add-Type -TypeDefinition \'[DllImport(\"user32.dll\")] public static extern int PostMessage(int hWnd, int msg, int wParam, int lParam);\' -Name Win32 -Namespace PInvoke; [PInvoke.Win32]::PostMessage((Get-Process chrome,helium | Where-Object { $_.MainWindowHandle -ne 0 }).MainWindowHandle, 0x10, 0, 0)"',
  ];

  for (const cmd of methods) {
    try {
      await execAsync(cmd);
      anySuccess = true;
    } catch (error) {
      console.log(`Method failed: ${cmd}`, error);
    }
  }
  return anySuccess;
}

export default async function main() {
  try {
    const success = await terminateProcesses();
    await showHUD(success ? "✅ Browser closed" : "❌ Failed to close browser");
  } catch (error) {
    await showHUD("❌ Error closing browser");
    console.error("Error:", error);
  }
}
