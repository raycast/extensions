param(
    [Parameter(Mandatory=$true)]
    [string]$handle
)

Add-Type @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
    [DllImport("user32.dll")]
    public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    [return: MarshalAs(UnmanagedType.Bool)]
    public static extern bool IsWindow(IntPtr hWnd);

    public const uint WM_CLOSE = 0x0010;
}
"@

# Convert string to int64, then to IntPtr
$handleInt = [int64]$handle
$hwnd = [IntPtr]::new($handleInt)

# Verify window exists
if (-not [Win32]::IsWindow($hwnd)) {
    throw "Window handle $handle is not valid or window no longer exists"
}

[void][Win32]::SendMessage($hwnd, [Win32]::WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero)
