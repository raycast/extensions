import { showHUD } from "@raycast/api";
import { runAppleScript, runPowerShellScript } from "@raycast/utils";

import { buildScriptEnsuringSlackIsRunning } from "./shared/utils";

export default async function Command() {
  await showHUD(`Open unread messages`);
  if (process.platform === "win32") {
    await runPowerShellScript(
      `Add-Type @"
using System;
using System.Runtime.InteropServices;

public class User32 {
    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);
    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);
    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);
    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);
    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();
}
"@

$processName = "slack"

$proc = Get-Process -Name $processName -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
if (-not $proc) {
    Write-Host "Process '$processName' not found or has no main window."
    return $false
}

$hwnd = $proc.MainWindowHandle

if ([User32]::IsIconic($hwnd)) {
    # Restore if minimized
    [User32]::ShowWindowAsync($hwnd, 9) | Out-Null
}

# Attach input threads if needed
$foregroundThreadId = [User32]::GetCurrentThreadId()
$targetThreadId = [User32]::GetWindowThreadProcessId($hwnd, [ref]0)
[User32]::AttachThreadInput($foregroundThreadId, $targetThreadId, $true)

# Bring to foreground
[User32]::SetForegroundWindow($hwnd) | Out-Null

# Detach threads
[User32]::AttachThreadInput($foregroundThreadId, $targetThreadId, $false)

Start-Sleep -Milliseconds 300
Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.SendKeys]::SendWait("^(+A)")  # Ctrl+Shift+A
`,
    );
  } else {
    await runAppleScript(
      buildScriptEnsuringSlackIsRunning(`
        tell application "System Events" to tell process "Slack" to keystroke "A" using {command down, shift down}
      `),
    );
  }

  return null;
}
