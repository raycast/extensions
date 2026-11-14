Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public class TrayRefresher {
    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll", SetLastError = true)]
    static extern IntPtr FindWindowEx(IntPtr parentHandle, IntPtr childAfter, string className, string windowTitle);

    [DllImport("user32.dll")]
    static extern bool GetClientRect(IntPtr hWnd, out RECT lpRect);

    [DllImport("user32.dll")]
    static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    const uint WM_MOUSEMOVE = 0x0200;

    public static void RefreshTray() {
        IntPtr trayWnd = FindWindow("Shell_TrayWnd", null);
        if (trayWnd != IntPtr.Zero) {
            IntPtr trayNotify = FindWindowEx(trayWnd, IntPtr.Zero, "TrayNotifyWnd", null);
            if (trayNotify != IntPtr.Zero) {
                IntPtr sysPager = FindWindowEx(trayNotify, IntPtr.Zero, "SysPager", null);
                IntPtr toolbar = sysPager != IntPtr.Zero ?
                    FindWindowEx(sysPager, IntPtr.Zero, "ToolbarWindow32", null) :
                    FindWindowEx(trayNotify, IntPtr.Zero, "ToolbarWindow32", null);
                if (toolbar != IntPtr.Zero) RefreshToolbar(toolbar);
            }
        }

        IntPtr overflowWnd = FindWindow("NotifyIconOverflowWindow", null);
        if (overflowWnd != IntPtr.Zero) {
            IntPtr overflowToolbar = FindWindowEx(overflowWnd, IntPtr.Zero, "ToolbarWindow32", null);
            if (overflowToolbar != IntPtr.Zero) RefreshToolbar(overflowToolbar);
        }
    }

    private static void RefreshToolbar(IntPtr toolbar) {
        RECT rect;
        if (GetClientRect(toolbar, out rect)) {
            for (int x = 0; x < rect.Right; x += 8) {
                for (int y = 0; y < rect.Bottom; y += 8) {
                    SendMessage(toolbar, WM_MOUSEMOVE, IntPtr.Zero, (IntPtr)((y << 16) | (x & 0xFFFF)));
                }
            }
        }
    }
}
"@

[TrayRefresher]::RefreshTray()
Write-Output "TRAY REFRESHED"
