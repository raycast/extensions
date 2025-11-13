param(
    [Parameter(Mandatory=$true)]
    [string]$handle
)

if (-not ('Win32Switcher' -as [type])) {
    try {
        Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class Win32Switcher {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, int dwFlags, int dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern void SwitchToThisWindow(IntPtr hWnd, bool fAltTab);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, IntPtr ProcessId);

    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsIconic(IntPtr hWnd);
}
"@
    } catch {
        Write-Host "[switch-window.ps1] Add-Type failed: $_"
        if ($_.Exception) {
            Write-Host "[switch-window.ps1] Exception details: $($_.Exception.Message)"
            if ($_.Exception.InnerException) {
                Write-Host "[switch-window.ps1] Inner exception: $($_.Exception.InnerException.Message)"
            }
        }
    }
}

if (-not ('Win32Switcher' -as [type])) {
    Write-Host "[switch-window.ps1] ERROR: Win32Switcher type is not available. Aborting."
    exit 10
}

try {
    Write-Host "[switch-window.ps1] Converting handle to IntPtr..."
    $handleInt = [int]$handle
    $hwnd = [IntPtr]$handleInt

    Write-Host "[switch-window.ps1] Checking if window exists..."
    if (-not [Win32Switcher]::IsWindow($hwnd)) {
        Write-Host "[switch-window.ps1] Window handle is not valid"
        exit 2
    }

    $foregroundWindow = [Win32Switcher]::GetForegroundWindow()
    $foreThread = [Win32Switcher]::GetWindowThreadProcessId($foregroundWindow, [IntPtr]::Zero)
    $targetThread = [Win32Switcher]::GetWindowThreadProcessId($hwnd, [IntPtr]::Zero)
    $currentThread = [Win32Switcher]::GetCurrentThreadId()

    $threadsAttached = $false
    if ($foreThread -ne $targetThread) {
        Write-Host "[switch-window.ps1] Attaching threads..."
        $threadsAttached = [Win32Switcher]::AttachThreadInput($foreThread, $targetThread, $true)
    }

    try {
        $isMinimized = [Win32Switcher]::IsIconic($hwnd)
        Write-Host "[switch-window.ps1] Window minimized: $isMinimized"
        if ($isMinimized) {
            Write-Host "[switch-window.ps1] Restoring window..."
            [void][Win32Switcher]::ShowWindow($hwnd, 9)
        }

        Write-Host "[switch-window.ps1] Setting foreground..."
        $setForegroundResult = [Win32Switcher]::SetForegroundWindow($hwnd)
        if (-not $setForegroundResult) {
            Write-Host "[switch-window.ps1] SetForegroundWindow failed, trying SwitchToThisWindow..."
            [void][Win32Switcher]::SwitchToThisWindow($hwnd, $true)
        }

        Start-Sleep -Milliseconds 50
        Write-Host "[switch-window.ps1] Bringing window to top..."
        [void][Win32Switcher]::BringWindowToTop($hwnd)

        $newForeground = [Win32Switcher]::GetForegroundWindow()
        Write-Host "[switch-window.ps1] New foreground: $newForeground"
        if ($newForeground -eq $hwnd) {
            Write-Host "[switch-window.ps1] Success: window switched."
            exit 0
        } else {
            Write-Host "[switch-window.ps1] Failure: window not switched."
            exit 3
        }
    }
    finally {
        if ($threadsAttached) {
            Write-Host "[switch-window.ps1] Detaching threads..."
            [void][Win32Switcher]::AttachThreadInput($foreThread, $targetThread, $false)
        }
    }
}
catch {
    Write-Host "[switch-window.ps1] Exception: $_"
    exit 1
}