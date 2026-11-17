/** The current Finder (macOS) or File Explorer (Windows) selection, all items. */
import { getSelectedFinderItems } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { isMac } from "./endpoint";

const execFileAsync = promisify(execFile);

export const fileManagerName = isMac ? "Finder" : "File Explorer";

// Prefers the foreground Explorer window, then any other Explorer window with a selection.
const EXPLORER_SELECTION_SCRIPT = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$shell = New-Object -ComObject Shell.Application
$windows = @($shell.Windows() | Where-Object { $_ -ne $null -and $_.FullName -match '[\\\\/]explorer\\.exe$' })
$foreground = 0
try {
  Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class BlipUser32 { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); }
"@
  $foreground = [BlipUser32]::GetForegroundWindow().ToInt64()
} catch {}
$ordered = @($windows | Where-Object { $_.HWND -eq $foreground }) + @($windows | Where-Object { $_.HWND -ne $foreground })
foreach ($window in $ordered) {
  try {
    $items = @($window.Document.SelectedItems())
    if ($items.Count -gt 0) { $items | ForEach-Object { $_.Path }; exit 0 }
  } catch {}
}
exit 0`;

export async function getSelectedPaths(): Promise<string[]> {
  if (isMac) {
    try {
      return (await getSelectedFinderItems()).map((item) => item.path);
    } catch {
      return [];
    }
  }
  const { stdout } = await execFileAsync(
    "powershell.exe",
    [
      "-NoLogo",
      "-NoProfile",
      "-NonInteractive",
      "-STA",
      "-ExecutionPolicy",
      "Bypass",
      "-Command",
      EXPLORER_SELECTION_SCRIPT,
    ],
    { timeout: 10000 },
  );
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}
