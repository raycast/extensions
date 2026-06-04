export function buildSelectedExplorerPathScript() {
  return `
try {
  $shell = New-Object -ComObject Shell.Application
  $windows = @($shell.Windows() | Where-Object { $_ -ne $null -and $_.FullName -match '[\\\\/]explorer\\.exe$' })
  if ($windows.Count -eq 0) { throw 'no_window' }

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

  $foregroundExplorers = @($windows | Where-Object { $_.HWND -eq $foregroundWindow })
  $otherExplorers = @($windows | Where-Object { $_.HWND -ne $foregroundWindow })
  $explorers = @($foregroundExplorers + $otherExplorers)

  foreach ($window in $explorers) {
    try {
      $items = @($window.Document.SelectedItems())
      if ($items.Count -gt 0 -and $items[0].Path) {
        Write-Output $items[0].Path
        exit 0
      }
    } catch {}
  }

  Add-Type -AssemblyName System.Windows.Forms
  $previousClipboard = $null
  $hadClipboard = [System.Windows.Forms.Clipboard]::ContainsData("Preferred DropEffect") -or
    [System.Windows.Forms.Clipboard]::ContainsFileDropList() -or
    [System.Windows.Forms.Clipboard]::ContainsText()
  if ($hadClipboard) {
    $previousClipboard = [System.Windows.Forms.Clipboard]::GetDataObject()
  }

  try {
    [System.Windows.Forms.SendKeys]::SendWait("^c")
    Start-Sleep -Milliseconds 250
    $fileDropList = [System.Windows.Forms.Clipboard]::GetFileDropList()
    if ($fileDropList.Count -gt 0) {
      Write-Output $fileDropList[0]
      exit 0
    }
  } finally {
    if ($previousClipboard -ne $null) {
      [System.Windows.Forms.Clipboard]::SetDataObject($previousClipboard, $true)
    } elseif (-not $hadClipboard) {
      [System.Windows.Forms.Clipboard]::Clear()
    }
  }

  throw 'no_selection'
} catch {
  Write-Error $_.Exception.Message
  exit 1
}`;
}

export function getWindowsPowerShellArguments(script?: string) {
  return ["-NoLogo", "-NoProfile", "-NonInteractive", "-STA", "-ExecutionPolicy", "Bypass", "-Command", script ?? "-"];
}

export function buildWindowsBlipVerbScript(path: string) {
  const escapedPath = path.replace(/'/g, "''");

  return `
try {
  $filePath = '${escapedPath}'
  $folder = Split-Path $filePath -Parent
  $file = Split-Path $filePath -Leaf
  $shell = New-Object -ComObject Shell.Application
  $shellFolder = $shell.NameSpace($folder)
  if ($null -eq $shellFolder) { throw 'folder_not_found' }
  $shellFile = $shellFolder.ParseName($file)
  if ($null -eq $shellFile) { throw 'file_not_found' }
  $blipVerb = @($shellFile.Verbs() | Where-Object { $_.Name -match 'Blip' })
  if ($blipVerb.Count -eq 0) { throw 'blip_not_found' }
  $blipVerb[0].DoIt()
  Start-Sleep -Milliseconds 500
} catch {
  Write-Error $_.Exception.Message
  exit 1
}`;
}
