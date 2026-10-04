# Prints the paths selected in File Explorer, one per line.
#
# Raycast takes focus when it opens, so the foreground window is Raycast itself and
# GetForegroundWindow is no help. Walking the window Z-order instead and taking the
# frontmost Explorer window gives the folder the person was just looking at.

$ErrorActionPreference = "Stop"

$source = @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public static class ExplorerWindows
{
    [DllImport("user32.dll")] private static extern IntPtr GetTopWindow(IntPtr hWnd);
    [DllImport("user32.dll")] private static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetClassName(IntPtr hWnd, StringBuilder text, int count);

    private const uint GW_HWNDNEXT = 2;

    /// Handles of the visible File Explorer windows, frontmost first.
    public static long[] InZOrder()
    {
        List<long> found = new List<long>();
        StringBuilder name = new StringBuilder(256);
        for (IntPtr window = GetTopWindow(IntPtr.Zero); window != IntPtr.Zero; window = GetWindow(window, GW_HWNDNEXT))
        {
            if (!IsWindowVisible(window)) continue;
            name.Length = 0;
            GetClassName(window, name, name.Capacity);
            string className = name.ToString();
            if (className == "CabinetWClass" || className == "ExploreWClass") found.Add(window.ToInt64());
        }
        return found.ToArray();
    }
}
'@

Add-Type -TypeDefinition $source -Language CSharp

$ordered = [ExplorerWindows]::InZOrder()
if ($ordered.Length -eq 0) { exit 0 }

# Shell.Application exposes the selection, but not the Z-order, so match the two by handle.
$shell = New-Object -ComObject Shell.Application
$byHandle = @{}
foreach ($window in $shell.Windows()) {
  try { $byHandle[[long]$window.HWND] = $window } catch { }
}

foreach ($handle in $ordered) {
  if (-not $byHandle.ContainsKey($handle)) { continue }
  foreach ($item in $byHandle[$handle].Document.SelectedItems()) {
    # Virtual items such as libraries, This PC and cloud placeholders report a shell
    # GUID rather than a path. Blip can only send things that exist on disk.
    $itemPath = $item.Path
    if ($itemPath -and (Test-Path -LiteralPath $itemPath)) { Write-Output $itemPath }
  }
  break
}
