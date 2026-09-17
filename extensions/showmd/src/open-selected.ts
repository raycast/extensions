import { getSelectedFinderItems, showToast, Toast } from "@raycast/api";
import { runPowerShellScript } from "@raycast/utils";
import { promises as fsp } from "node:fs";
import { openInShowmd } from "./lib/raycast-glue";
import {
  errorMessage,
  isDarwin,
  pickSelectionTarget,
  type SelectedItem,
} from "./lib/showmd";

// Enumerates open Explorer windows via Shell.Application COM, prefers the one
// with OS focus, falls back to the first window that has a selection (e.g.
// Raycast itself has focus). Prints one selected path per line.
const WINDOWS_SELECTION_SCRIPT = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class ShowmdWin32 {
  [DllImport("user32.dll")]
  public static extern IntPtr GetForegroundWindow();
}
"@

$shell = New-Object -ComObject Shell.Application
$foreground = [ShowmdWin32]::GetForegroundWindow()

$explorerWindows = @()
foreach ($w in $shell.Windows()) {
  try {
    if ($w.FullName -like "*explorer.exe") { $explorerWindows += $w }
  } catch {}
}

$target = $null
foreach ($w in $explorerWindows) {
  try {
    if ([IntPtr]$w.HWND -eq $foreground) { $target = $w; break }
  } catch {}
}

if (-not $target) {
  foreach ($w in $explorerWindows) {
    try {
      if ($w.Document.SelectedItems().Count -gt 0) { $target = $w; break }
    } catch {}
  }
}

if ($target) {
  try {
    foreach ($item in $target.Document.SelectedItems()) {
      Write-Output $item.Path
    }
  } catch {}
}
`;

async function macSelection(): Promise<string[]> {
  const items = await getSelectedFinderItems();
  return items.map((item) => item.path);
}

async function windowsSelection(): Promise<string[]> {
  const output = await runPowerShellScript(WINDOWS_SELECTION_SCRIPT);
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function statItems(paths: string[]): Promise<SelectedItem[]> {
  const items: SelectedItem[] = [];
  for (const p of paths) {
    try {
      const stat = await fsp.stat(p);
      items.push({ path: p, isDirectory: stat.isDirectory() });
    } catch {
      // no longer on disk between selection and stat: drop it silently
    }
  }
  return items;
}

export default async function OpenSelected() {
  let paths: string[];
  try {
    paths = isDarwin(process.platform)
      ? await macSelection()
      : await windowsSelection();
  } catch (err) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Could not read the current selection",
      message: errorMessage(err),
    });
    return;
  }

  const items = await statItems(paths);
  const { target, skipped } = pickSelectionTarget(items);

  if (!target) {
    await showToast({
      style: Toast.Style.Success,
      title: "No markdown file or folder selected",
    });
    return;
  }

  if (skipped > 0) {
    await showToast({
      style: Toast.Style.Success,
      title: `Opening 1 item, skipped ${skipped}`,
    });
  }

  await openInShowmd(target);
}
