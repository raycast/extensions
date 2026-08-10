import { getSelectedFinderItems } from "@raycast/api";
import { runPowerShellScript } from "@raycast/utils";

export async function getSelectedFilePaths(): Promise<string[]> {
  const filePaths =
    process.platform === "win32"
      ? await getSelectedExplorerPaths()
      : await getSelectedFinderPaths();
  const uniqueFilePaths = Array.from(
    new Set(filePaths.map((filePath) => filePath.trim()).filter(Boolean)),
  );

  if (uniqueFilePaths.length === 0) {
    throw new Error(
      process.platform === "win32"
        ? "Select one or more files or folders in Explorer first."
        : "Select one or more files or folders in Finder first.",
    );
  }

  return uniqueFilePaths;
}

async function getSelectedFinderPaths(): Promise<string[]> {
  try {
    const selectedItems = await getSelectedFinderItems();
    return selectedItems.map((item) => item.path);
  } catch (error) {
    throw new Error(`Could not read Finder selection. ${String(error)}`);
  }
}

async function getSelectedExplorerPaths(): Promise<string[]> {
  const script = `
$ErrorActionPreference = "Stop"
Add-Type @"
using System;
using System.Runtime.InteropServices;
public class GetCompressWin32 {
  public const uint GW_HWNDNEXT = 2;

  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();

  [DllImport("user32.dll")]
  public static extern IntPtr GetTopWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);
}
"@

$foregroundHwnd = [GetCompressWin32]::GetForegroundWindow().ToInt64()
$zOrderByHwnd = @{}
$rank = 0
$hwnd = [GetCompressWin32]::GetTopWindow([IntPtr]::Zero)
while ($hwnd -ne [IntPtr]::Zero) {
  $zOrderByHwnd[$hwnd.ToInt64()] = $rank
  $rank += 1
  $hwnd = [GetCompressWin32]::GetWindow($hwnd, [GetCompressWin32]::GW_HWNDNEXT)
}

$shell = New-Object -ComObject Shell.Application
$explorerWindows = @()
foreach ($window in @($shell.Windows())) {
  try {
    if ([System.IO.Path]::GetFileName($window.FullName).ToLowerInvariant() -ne "explorer.exe") {
      continue
    }

    $paths = @()
    foreach ($item in @($window.Document.SelectedItems())) {
      if ($item.Path -and ([System.IO.File]::Exists($item.Path) -or [System.IO.Directory]::Exists($item.Path))) {
        $paths += $item.Path
      }
    }

    $hwndValue = [int64]$window.HWND
    $zOrder = if ($zOrderByHwnd.ContainsKey($hwndValue)) {
      [int]$zOrderByHwnd[$hwndValue]
    } else {
      [int]::MaxValue
    }

    $explorerWindows += [pscustomobject]@{
      Hwnd = $hwndValue
      IsForeground = $hwndValue -eq $foregroundHwnd
      ZOrder = $zOrder
      Paths = @($paths)
    }
  } catch {
    continue
  }
}

$selectedWindow = @($explorerWindows | Where-Object {
  $_.IsForeground
} | Select-Object -First 1)

if ($selectedWindow.Count -eq 0) {
  # Raycast can have focus while Explorer still owns the selection.
  $selectedWindow = @($explorerWindows | Where-Object {
    $_.Paths.Count -gt 0
  } | Sort-Object ZOrder | Select-Object -First 1)
}

$paths = @()
if ($selectedWindow.Count -gt 0) {
  $paths = @($selectedWindow[0].Paths)
}

ConvertTo-Json -InputObject @($paths) -Compress
`;

  const stdout = await runPowerShellScript(script, {
    timeout: 5000,
  });

  return parseStringArrayJson(stdout);
}

function parseStringArrayJson(json: string): string[] {
  const parsed: unknown = JSON.parse(json.trim() || "[]");
  if (!Array.isArray(parsed)) {
    throw new Error("Explorer selection returned an unexpected result.");
  }

  return parsed.filter((value): value is string => typeof value === "string");
}
