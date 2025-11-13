param(
    [switch]$AllMonitors = $false
)

# Suppress progress bars for faster execution
$ProgressPreference = 'SilentlyContinue'

# Ensure UTF-8 output encoding
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
using System.Text;

public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
}

public struct POINT {
    public int X;
    public int Y;
}

public class Win32 {
    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    public static extern IntPtr MonitorFromWindow(IntPtr hwnd, uint dwFlags);

    [DllImport("user32.dll")]
    public static extern IntPtr MonitorFromPoint(POINT pt, uint dwFlags);

    [DllImport("user32.dll")]
    public static extern bool GetCursorPos(out POINT lpPoint);

    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll")]
    public static extern IntPtr GetWindow(IntPtr hWnd, uint uCmd);

    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    public const uint MONITOR_DEFAULTTONEAREST = 0x00000002;
    public const int GWL_EXSTYLE = -20;
    public const int WS_EX_APPWINDOW = 0x00040000;
    public const int WS_EX_TOOLWINDOW = 0x00000080;
    public const uint GW_OWNER = 4;
}
"@ -IgnoreWarnings -ErrorAction SilentlyContinue

# Get the active monitor (where cursor is)
$activeMonitor = [IntPtr]::Zero
$filterByMonitor = -not $AllMonitors

if ($filterByMonitor) {
    $cursorPos = New-Object POINT
    [void][Win32]::GetCursorPos([ref]$cursorPos)
    $activeMonitor = [Win32]::MonitorFromPoint($cursorPos, [Win32]::MONITOR_DEFAULTTONEAREST)
}

# Create array to store windows
$windows = @()

# Caches for optimal performance
$processCache = @{}           # Cache Process objects by PID
$versionInfoCache = @{}       # Cache version info by executable path (not PID)
$pathCache = @{}              # Cache for system paths by process name
$allProcesses = $null         # Single Get-Process call result

# Get all processes once (bulk operation is faster than individual calls)
function Initialize-ProcessCache {
    $script:allProcesses = @{}
    Get-Process | ForEach-Object {
        $script:allProcesses[$_.Id] = $_
    }
}

# Helper function to get process info from pre-loaded cache
function Get-ProcessInfo {
    param([int]$processId)

    if ($script:allProcesses -eq $null) {
        Initialize-ProcessCache
    }

    return $script:allProcesses[$processId]
}

# Helper function to get version info on-demand (cached by path, not PID)
function Get-VersionInfo {
    param([string]$executablePath)

    if (-not $executablePath) {
        return @{ FileDescription = ""; ProductName = "" }
    }

    if (-not $script:versionInfoCache.ContainsKey($executablePath)) {
        $fileDescription = ""
        $productName = ""

        try {
            # Direct .NET call is faster than MainModule.FileVersionInfo
            $versionInfo = [System.Diagnostics.FileVersionInfo]::GetVersionInfo($executablePath)
            $fileDescription = $versionInfo.FileDescription
            $productName = $versionInfo.ProductName
        } catch {
            # Silently continue
        }

        $script:versionInfoCache[$executablePath] = @{
            FileDescription = $fileDescription
            ProductName = $productName
        }
    }
    return $script:versionInfoCache[$executablePath]
}

# Create a delegate for the callback
$callback = [Win32+EnumWindowsProc] {
    param([IntPtr]$hwnd, [IntPtr]$lparam)

    try {
        # Only process visible windows
        if ([Win32]::IsWindowVisible($hwnd)) {
            # If filtering by active monitor, check which monitor this window is on
            if ($script:filterByMonitor -and $script:activeMonitor -ne [IntPtr]::Zero) {
                $windowMonitor = [Win32]::MonitorFromWindow($hwnd, [Win32]::MONITOR_DEFAULTTONEAREST)
                if ($windowMonitor -ne $script:activeMonitor) {
                    return $true  # Skip this window, it's on a different monitor
                }
            }

            # Check if window should appear on taskbar
            # A window appears on the taskbar if:
            # 1. It's visible
            # 2. It has no owner window (not a child/dialog)
            # 3. Either: has WS_EX_APPWINDOW style OR (doesn't have WS_EX_TOOLWINDOW and has no owner)
            $exStyle = [Win32]::GetWindowLong($hwnd, [Win32]::GWL_EXSTYLE)
            $owner = [Win32]::GetWindow($hwnd, [Win32]::GW_OWNER)

            $isToolWindow = ($exStyle -band [Win32]::WS_EX_TOOLWINDOW) -ne 0
            $isAppWindow = ($exStyle -band [Win32]::WS_EX_APPWINDOW) -ne 0

            # Skip windows that wouldn't appear on taskbar
            if ($isToolWindow -and -not $isAppWindow) {
                return $true  # Tool windows don't appear on taskbar
            }

            if ($owner -ne [IntPtr]::Zero -and -not $isAppWindow) {
                return $true  # Owned windows (dialogs) don't appear on taskbar
            }

            # Get window title
            $title = New-Object System.Text.StringBuilder 256
            [void][Win32]::GetWindowText($hwnd, $title, 256)
            $titleText = $title.ToString()

            # Only include windows with non-empty titles
            if ($titleText) {

                # Get process ID for this window
                [uint32]$processId = 0
                [void][Win32]::GetWindowThreadProcessId($hwnd, [ref]$processId)

                # Get process info from pre-loaded cache
                $process = Get-ProcessInfo -processId ([int]$processId)

                if ($process) {
                    # Get executable path first (with fallback for system processes)
                    $exePath = ""
                    if ($process.Path) {
                        $exePath = $process.Path
                    } else {
                        # For system processes without accessible path, try common locations (cached)
                        $processName = $process.ProcessName

                        # Check cache first
                        if ($script:pathCache.ContainsKey($processName)) {
                            $exePath = $script:pathCache[$processName]
                        } else {
                            # Try common locations and cache result
                            $testPath = "$env:SystemRoot\System32\$processName.exe"
                            if ([System.IO.File]::Exists($testPath)) {
                                $exePath = $testPath
                            } else {
                                $testPath = "$env:SystemRoot\SysWOW64\$processName.exe"
                                if ([System.IO.File]::Exists($testPath)) {
                                    $exePath = $testPath
                                }
                            }
                            $script:pathCache[$processName] = $exePath
                        }
                    }

                    # Get version info (cached by path, so multiple windows from same app are fast)
                    $versionInfo = Get-VersionInfo -executablePath $exePath

                    # Use FileDescription if available, otherwise fallback to ProcessName
                    $displayName = if ($versionInfo.FileDescription) {
                        $versionInfo.FileDescription
                    } elseif ($versionInfo.ProductName) {
                        $versionInfo.ProductName
                    } else {
                        $process.ProcessName
                    }

                    # Build window object directly (faster than hashtable operations)
                    $script:windows += @{
                        handle = $hwnd.ToInt64().ToString()
                        title = $titleText
                        processName = $displayName
                        executablePath = $exePath
                        rawProcessName = $process.ProcessName
                    }
                }
            }
        }
    } catch {
        # Silently continue on errors
    }

    return $true
}

# Pre-load all processes before enumeration (single bulk call)
Initialize-ProcessCache

# Execute enumeration
[void][Win32]::EnumWindows($callback, [IntPtr]::Zero)

# Output as JSON
if ($windows.Count -eq 0) {
    "[]"
} else {
    $windows | ConvertTo-Json -Compress -Depth 1
}
