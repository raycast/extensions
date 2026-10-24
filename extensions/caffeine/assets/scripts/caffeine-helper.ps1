# Raycast Caffeine Helper
# Temporarily prevents Windows from sleeping or turning off the display using SetThreadExecutionState.
# Displays a native Windows System Tray icon with live status and quick controls while active.

param(
    [int]$DurationSeconds = 0,
    [int]$PreventDisplaySleep = 1,
    [string]$IconPath = "",
    [string]$ReadyFile = "",
    [string]$StatusFile = ""
)

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms, System.Drawing -ErrorAction SilentlyContinue

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class WinPower {
    private const uint ES_CONTINUOUS = 0x80000000;
    private const uint ES_SYSTEM_REQUIRED = 0x00000001;
    private const uint ES_DISPLAY_REQUIRED = 0x00000002;

    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern uint SetThreadExecutionState(uint esFlags);

    [DllImport("user32.dll", CharSet = CharSet.Auto)]
    public static extern bool DestroyIcon(IntPtr handle);

    public static uint Enable(bool keepDisplayAwake) {
        uint flags = ES_CONTINUOUS | ES_SYSTEM_REQUIRED;
        if (keepDisplayAwake) {
            flags |= ES_DISPLAY_REQUIRED;
        }
        return SetThreadExecutionState(flags);
    }

    public static uint Disable() {
        return SetThreadExecutionState(ES_CONTINUOUS);
    }
}
"@

$keepDisplay = ($PreventDisplaySleep -ne 0)

# Enable keep-awake execution state
$prev = [WinPower]::Enable($keepDisplay)
if ($prev -eq 0) {
    exit 1
}

# Capture process identity and start time
$proc = [System.Diagnostics.Process]::GetCurrentProcess()
$startTimeMs = [DateTimeOffset]::new($proc.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds()

if (![string]::IsNullOrWhiteSpace($StatusFile)) {
    try {
        $statusDir = [System.IO.Path]::GetDirectoryName($StatusFile)
        if (![string]::IsNullOrWhiteSpace($statusDir) -and !(Test-Path $statusDir)) {
            New-Item -ItemType Directory -Path $statusDir -Force | Out-Null
        }
        $statusObj = @{
            pid = $PID
            startTime = $startTimeMs
            active = $true
        }
        $statusJson = $statusObj | ConvertTo-Json -Compress
        [System.IO.File]::WriteAllText($StatusFile, $statusJson)
    } catch {}
}

if (![string]::IsNullOrWhiteSpace($ReadyFile)) {
    try {
        $readyDir = [System.IO.Path]::GetDirectoryName($ReadyFile)
        if (![string]::IsNullOrWhiteSpace($readyDir) -and !(Test-Path $readyDir)) {
            New-Item -ItemType Directory -Path $readyDir -Force | Out-Null
        }
        $readyObj = @{
            pid = $PID
            startTime = $startTimeMs
            status = "ready"
        }
        $readyJson = $readyObj | ConvertTo-Json -Compress
        [System.IO.File]::WriteAllText($ReadyFile, $readyJson)
    } catch {}
}

# Resolve icon path
$resolvedIconPath = $null
$candidates = @(
    $IconPath,
    (Join-Path $PSScriptRoot "..\icon.png"),
    (Join-Path $PSScriptRoot "icon.png"),
    (Join-Path (Get-Location) "assets\icon.png")
)

foreach ($c in $candidates) {
    if (![string]::IsNullOrWhiteSpace($c) -and (Test-Path $c)) {
        $resolvedIconPath = (Resolve-Path $c).Path
        break
    }
}

$notifyIcon = $null
$bmp = $null
$hIcon = [IntPtr]::Zero
$stopEvent = $null
$script:keepRunning = $true

try {
    # Create named stop event for graceful termination signaling
    $stopEvent = New-Object System.Threading.EventWaitHandle($false, [System.Threading.EventResetMode]::ManualReset, "Local\Caffeine_Stop_$PID")

    # Initialize Windows System Tray NotifyIcon
    $notifyIcon = New-Object System.Windows.Forms.NotifyIcon

    if ($resolvedIconPath) {
        try {
            $bmp = [System.Drawing.Bitmap]::FromFile($resolvedIconPath)
            $hIcon = $bmp.GetHicon()
            $notifyIcon.Icon = [System.Drawing.Icon]::FromHandle($hIcon)
        } catch {
            $notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
        }
    } else {
        $notifyIcon.Icon = [System.Drawing.SystemIcons]::Application
    }

    # Build Context Menu for System Tray
    $contextMenu = New-Object System.Windows.Forms.ContextMenuStrip

    $headerItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $headerItem.Text = "Caffeine is Active"
    $headerItem.Enabled = $false
    $contextMenu.Items.Add($headerItem) | Out-Null

    $contextMenu.Items.Add((New-Object System.Windows.Forms.ToolStripSeparator)) | Out-Null

    $stopItem = New-Object System.Windows.Forms.ToolStripMenuItem
    $stopItem.Text = "Turn Off Caffeine"
    $stopItem.Add_Click({
        $script:keepRunning = $false
    })
    $contextMenu.Items.Add($stopItem) | Out-Null

    $notifyIcon.ContextMenuStrip = $contextMenu

    # Double click on tray icon stops Caffeine
    $notifyIcon.Add_DoubleClick({
        $script:keepRunning = $false
    })

    $startTime = [DateTime]::UtcNow
    $endTime = if ($DurationSeconds -gt 0) { $startTime.AddSeconds($DurationSeconds) } else { $null }

    # Initial tooltip (max 63 chars for Win32 API)
    if ($DurationSeconds -gt 0) {
        $notifyIcon.Text = "Caffeine - Active (" + $DurationSeconds + "s)"
    } else {
        $notifyIcon.Text = "Caffeine - Active (Indefinitely)"
    }

    $notifyIcon.Visible = $true

    # Event loop
    $lastUpdate = [DateTime]::MinValue

    while ($script:keepRunning) {
        [System.Windows.Forms.Application]::DoEvents()

        # Check if stop event was signaled from Raycast
        if ($stopEvent.WaitOne(100)) {
            break
        }

        $now = [DateTime]::UtcNow

        if ($DurationSeconds -gt 0) {
            $remaining = ($endTime - $now).TotalSeconds
            if ($remaining -le 0) {
                break
            }

            if (($now - $lastUpdate).TotalSeconds -ge 1) {
                $lastUpdate = $now
                $remMin = [Math]::Ceiling($remaining / 60)
                $tip = if ($remMin -gt 60) {
                    $h = [Math]::Floor($remMin / 60)
                    $m = $remMin % 60
                    "Caffeine - Active ($h" + "h " + "$m" + "m remaining)"
                } elseif ($remMin -gt 1) {
                    "Caffeine - Active (" + $remMin + "m remaining)"
                } else {
                    $s = [Math]::Ceiling($remaining)
                    "Caffeine - Active (" + $s + "s remaining)"
                }

                if ($tip.Length -gt 63) {
                    $tip = $tip.Substring(0, 63)
                }
                $notifyIcon.Text = $tip
            }
        }
    }
} finally {
    if (![string]::IsNullOrWhiteSpace($StatusFile) -and (Test-Path $StatusFile)) {
        Remove-Item -Path $StatusFile -Force -ErrorAction SilentlyContinue
    }

    # Cleanly remove tray icon immediately
    if ($notifyIcon) {
        $notifyIcon.Visible = $false
        $notifyIcon.Dispose()
    }
    if ($bmp) {
        $bmp.Dispose()
    }
    if ($hIcon -ne [IntPtr]::Zero) {
        [WinPower]::DestroyIcon($hIcon) | Out-Null
    }
    if ($stopEvent) {
        $stopEvent.Close()
        $stopEvent.Dispose()
    }

    # Release Windows continuous execution state
    [WinPower]::Disable() | Out-Null
}

exit 0
