# Windows helpers for things Raycast's API doesn't cover. Prints JSON for the requested -Action.
param(
    [Parameter(Mandatory = $true)][ValidateSet('explorer-folder', 'list-windows', 'focus-window', 'close-windows')][string]$Action,
    [long]$Handle
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName UIAutomationClient, UIAutomationTypes
$Automation = [System.Windows.Automation.AutomationElement]

# Top-level windows, front to back.
function Get-TopLevelWindows {
    $Automation::RootElement.FindAll([System.Windows.Automation.TreeScope]::Children, [System.Windows.Automation.Condition]::TrueCondition)
}

function Get-CursorWindows {
    $ids = @(Get-Process -Name Cursor -ErrorAction SilentlyContinue | ForEach-Object Id)
    @(Get-TopLevelWindows | Where-Object { $ids -contains $_.Current.ProcessId -and $_.Current.Name })
}

switch ($Action) {
    'explorer-folder' {
        $result = [ordered]@{ folder = $null }
        $raycast = @(Get-Process -Name 'Raycast*' -ErrorAction SilentlyContinue | ForEach-Object Id)
        $previous = Get-TopLevelWindows | Where-Object {
            $raycast -notcontains $_.Current.ProcessId -and $_.Current.ClassName -notlike 'Shell_*TrayWnd'
        } | Select-Object -First 1
        if ($previous -and $previous.Current.ClassName -eq 'CabinetWClass') {
            $handle = [int64]$previous.Current.NativeWindowHandle
            $title = $previous.Current.Name
            # Each tab of the window is a separate shell window; the window title names the active one.
            $tabs = @((New-Object -ComObject Shell.Application).Windows() | Where-Object {
                try { [int64]$_.HWND -eq $handle } catch { $false }
            })
            $tab = $tabs | Where-Object { $_.LocationName -and $title.StartsWith($_.LocationName) } | Select-Object -First 1
            if (-not $tab) { $tab = $tabs | Select-Object -First 1 }
            if ($tab) {
                # Virtual locations such as "This PC" have shell paths like "::{20D04FE0-...}"; skip those.
                $folder = $tab.Document.Folder.Self.Path
                if ($folder -and -not $folder.StartsWith('::')) { $result.folder = $folder }
            }
        }
        ConvertTo-Json -InputObject $result -Compress
    }
    'list-windows' {
        $windows = Get-CursorWindows | ForEach-Object {
            [ordered]@{ handle = [int64]$_.Current.NativeWindowHandle; title = $_.Current.Name }
        }
        ConvertTo-Json -InputObject @($windows) -Compress
    }
    'focus-window' {
        $window = $Automation::FromHandle([IntPtr]::new($Handle))
        $pattern = $window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern)
        if ($pattern.Current.WindowVisualState -eq 'Minimized') {
            $pattern.SetWindowVisualState([System.Windows.Automation.WindowVisualState]::Normal)
        }
        ConvertTo-Json -InputObject ((New-Object -ComObject WScript.Shell).AppActivate($window.Current.Name)) -Compress
    }
    'close-windows' {
        $windows = Get-CursorWindows
        foreach ($window in $windows) {
            $window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern).Close()
        }
        ConvertTo-Json -InputObject $windows.Count -Compress
    }
}
