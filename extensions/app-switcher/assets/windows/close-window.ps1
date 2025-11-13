param(
    [Parameter(Mandatory=$true)]
    [string]$handle
)

if (-not ('Win32Closer' -as [type])) {
    try {
        Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32Closer {
    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindow(IntPtr hWnd);

    public const uint WM_CLOSE = 0x0010;
}
"@
    } catch {
        Write-Host "[close-window.ps1] Add-Type failed: $_"
        if ($_.Exception) {
            Write-Host "[close-window.ps1] Exception details: $($_.Exception.Message)"
            if ($_.Exception.InnerException) {
                Write-Host "[close-window.ps1] Inner exception: $($_.Exception.InnerException.Message)"
            }
        }
    }
}

# Convert string to int64, then to IntPtr
$handleInt = [int64]$handle
$hwnd = [IntPtr]::new($handleInt)

# Verify window exists
if (-not [Win32Closer]::IsWindow($hwnd)) {
    Write-Output "error: Window handle $handle is not valid or window no longer exists"
    exit 1
}

[void][Win32Closer]::SendMessage($hwnd, [Win32Closer]::WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero)
Write-Output "success"
exit 0
