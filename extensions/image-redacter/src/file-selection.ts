import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getSelectedFinderItems } from "@raycast/api";

const execFileAsync = promisify(execFile);

export async function getSelectedFilePath(): Promise<string | undefined> {
  try {
    if (process.platform === "darwin") {
      return (await getSelectedFinderItems())[0]?.path;
    }
    if (process.platform === "win32") return await getSelectedExplorerPath();
  } catch {
    // Selection is only a convenience; the file picker remains available.
  }
  return undefined;
}

async function getSelectedExplorerPath(): Promise<string | undefined> {
  const script = `
try {
  $shell = New-Object -ComObject Shell.Application
  $windows = @($shell.Windows() | Where-Object { $_ -ne $null -and $_.FullName -match '[\\\\/]explorer\\.exe$' })
  if ($windows.Count -eq 0) { exit 0 }

  $foregroundWindow = 0
  try {
    Add-Type @"
using System;
using System.Runtime.InteropServices;
public static class User32 {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
}
"@
    $foregroundWindow = [User32]::GetForegroundWindow().ToInt64()
  } catch {}

  $foreground = @($windows | Where-Object { $_.HWND -eq $foregroundWindow })
  $others = @($windows | Where-Object { $_.HWND -ne $foregroundWindow })
  foreach ($window in @($foreground + $others)) {
    try {
      $items = @($window.Document.SelectedItems())
      if ($items.Count -gt 0 -and $items[0].Path) {
        Write-Output $items[0].Path
        exit 0
      }
    } catch {}
  }
} catch {}
`;
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
      script,
    ],
    { timeout: 10_000 },
  );
  return stdout.trim() || undefined;
}
