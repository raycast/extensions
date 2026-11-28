param([ValidateSet('select','copy','select-and-copy')][string]$Mode)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
if ($Mode -eq 'select' -or $Mode -eq 'select-and-copy') {
    Add-Type -Path (Join-Path $PSScriptRoot 'selection-windows.cs')
    $foreground = [OwnDropExplorer]::GetForegroundWindow().ToInt64()
    $activeTab = [OwnDropExplorer]::ActiveTab($foreground)
    $shell = New-Object -ComObject Shell.Application
    $candidates = @($shell.Windows() | Where-Object { [long]$_.HWND -eq $foreground })
    if ($candidates.Count -eq 0) { throw 'File Explorer is not the foreground window' }
    $target = $null
    if ($activeTab -ne 0) {
        $matches = @()
        foreach ($window in $candidates) {
            # Multiple tabs can share HWND. Never take the first/last selection.
            if ([OwnDropExplorer]::BrowserWindow($window) -eq $activeTab) { $matches += $window }
        }
        if ($matches.Count -ne 1) { throw 'Could not identify the active Explorer tab' }
        $target = $matches[0]
    } elseif ($candidates.Count -eq 1) {
        # Windows 10 has no tab child window.
        $target = $candidates[0]
    } else { throw 'Explorer selection is ambiguous' }
    $selectedPaths = New-Object 'System.Collections.Generic.List[string]'
    foreach ($item in $target.Document.SelectedItems()) { $selectedPaths.Add([string]$item.Path) }
    $paths = $selectedPaths.ToArray()
    if ([OwnDropExplorer]::GetForegroundWindow().ToInt64() -ne $foreground -or
        [OwnDropExplorer]::ActiveTab($foreground) -ne $activeTab) { throw 'Selection changed' }
    if ($Mode -eq 'select') {
        ConvertTo-Json -InputObject $paths -Compress
        return
    }
} else {
    $paths = ConvertFrom-Json $env:OWNDROP_SELECTED_FILES
}
# Snapshot and clipboard write share one helper process; never reread selection.
if ($paths.Count -gt 0) {
    Add-Type -AssemblyName System.Windows.Forms
    $files = New-Object System.Collections.Specialized.StringCollection
    foreach ($file in $paths) {
        if (-not (Test-Path -LiteralPath $file)) { throw 'Selected file is unavailable' }
        [void]$files.Add($file)
    }
    $data = New-Object System.Windows.Forms.DataObject
    $data.SetFileDropList($files)
    [System.Windows.Forms.Clipboard]::SetDataObject($data, $true, 10, 100)
}

if ($Mode -eq 'select-and-copy') { ConvertTo-Json -InputObject $paths -Compress }
elseif ($Mode -eq 'copy' -and $paths.Count -eq 0) { throw 'No files selected' }
