/** The current Finder (macOS) or File Explorer (Windows) selection, all items. */
import { getSelectedFinderItems } from "@raycast/api";
import { runPowerShellScript } from "@raycast/utils";
import type { SendContent } from "./content";
import { isMac } from "./endpoint";

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

async function getSelectedPaths(): Promise<string[]> {
  if (isMac) {
    try {
      return (await getSelectedFinderItems()).map((item) => item.path);
    } catch {
      return [];
    }
  }
  // The script is read from stdin, where PowerShell only runs a multi-line block once a blank line follows it.
  const stdout = await runPowerShellScript(`${EXPLORER_SELECTION_SCRIPT}\n\n`);
  return stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** The selection as something to send, or undefined when nothing is selected. */
export async function readSelectionContent(): Promise<SendContent | undefined> {
  const paths = await getSelectedPaths();
  return paths.length ? { kind: "files", paths, source: `Selected in ${fileManagerName}` } : undefined;
}
