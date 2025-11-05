param(
    [Parameter(Mandatory=$true)]
    [string]$handle
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class Win32 {
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

try {
    # Convert string handle to integer first, then to IntPtr
    $handleInt = [int]$handle
    $hwnd = [IntPtr]$handleInt

    # Verify window exists
    if (-not [Win32]::IsWindow($hwnd)) {
        throw "Window handle is not valid"
    }

    # Get thread info
    $foregroundWindow = [Win32]::GetForegroundWindow()
    $foreThread = [Win32]::GetWindowThreadProcessId($foregroundWindow, [IntPtr]::Zero)
    $appThread = [Win32]::GetCurrentThreadId()

    # Attach threads
    $attached = [Win32]::AttachThreadInput($foreThread, $appThread, $true)

    try {
        # Only restore if window is minimized, otherwise just bring to front
        $isMinimized = [Win32]::IsIconic($hwnd)

        if ($isMinimized) {
            [void][Win32]::ShowWindow($hwnd, 9) # SW_RESTORE = 9
        } else {
            [void][Win32]::ShowWindow($hwnd, 5) # SW_SHOW = 5 (doesn't change maximized state)
        }

        [void][Win32]::SetForegroundWindow($hwnd)

        Start-Sleep -Milliseconds 50

        [void][Win32]::BringWindowToTop($hwnd)

        $newForeground = [Win32]::GetForegroundWindow()

        if ($newForeground -eq $hwnd) {
            exit 0
        } else {
            exit 1
        }
    }
    finally {
        [void][Win32]::AttachThreadInput($foreThread, $appThread, $false)
    }
}
catch {
    exit 1
}