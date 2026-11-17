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

# The frontmost window other than Raycast and the taskbar.
function Get-FrontWindow {
    $raycast = @(Get-Process -Name 'Raycast*' -ErrorAction SilentlyContinue | ForEach-Object Id)
    Get-TopLevelWindows | Where-Object {
        $raycast -notcontains $_.Current.ProcessId -and $_.Current.ClassName -notlike 'Shell_*TrayWnd'
    } | Select-Object -First 1
}

# Display names from the root down to the folder, as the address bar shows them.
function Get-FolderNames($folder) {
    $names = @()
    while ($folder) { $names = @($folder.Title) + $names; $folder = $folder.ParentFolder }
    $names
}

function Get-CursorWindows {
    $ids = @(Get-Process -Name Cursor -ErrorAction SilentlyContinue | ForEach-Object Id)
    @(Get-TopLevelWindows | Where-Object { $ids -contains $_.Current.ProcessId -and $_.Current.Name })
}

switch ($Action) {
    'explorer-folder' {
        $result = [ordered]@{ folder = $null }
        $previous = Get-FrontWindow
        if ($previous -and $previous.Current.ClassName -eq 'CabinetWClass') {
            $handle = [int64]$previous.Current.NativeWindowHandle
            # Each tab of the window is a separate shell window; the address bar shows the active one.
            $tabs = @((New-Object -ComObject Shell.Application).Windows() | Where-Object {
                try { [int64]$_.HWND -eq $handle } catch { $false }
            })
            $tab = $tabs | Select-Object -First 1
            if ($tabs.Count -gt 1) {
                $condition = New-Object System.Windows.Automation.PropertyCondition ($Automation::ClassNameProperty, 'FileExplorerExtensions.BreadcrumbBarItemControl')
                $crumbs = @($previous.FindAll([System.Windows.Automation.TreeScope]::Descendants, $condition) | ForEach-Object { $_.Current.Name })
                # Pick the tab whose path shares the longest ending with the address bar.
                $best = 0
                foreach ($candidate in $tabs) {
                    $names = @(Get-FolderNames $candidate.Document.Folder)
                    $shared = 0
                    while ($shared -lt $names.Count -and $shared -lt $crumbs.Count -and $names[-1 - $shared] -eq $crumbs[-1 - $shared]) { $shared++ }
                    if ($shared -gt $best) { $best = $shared; $tab = $candidate }
                }
            }
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
        # The window itself can't take focus, but focusing an element in it brings it to the front.
        $condition = New-Object System.Windows.Automation.PropertyCondition ($Automation::IsKeyboardFocusableProperty, $true)
        $window.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $condition).SetFocus()
        $focused = $false
        for ($i = 0; $i -lt 10 -and -not $focused; $i++) {
            Start-Sleep -Milliseconds 100
            $focused = (Get-FrontWindow).Current.NativeWindowHandle -eq $Handle
        }
        ConvertTo-Json -InputObject $focused -Compress
    }
    'close-windows' {
        $windows = Get-CursorWindows
        foreach ($window in $windows) {
            $window.GetCurrentPattern([System.Windows.Automation.WindowPattern]::Pattern).Close()
        }
        ConvertTo-Json -InputObject $windows.Count -Compress
    }
}
