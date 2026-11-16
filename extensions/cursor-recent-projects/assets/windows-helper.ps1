# Windows helpers for things Raycast's API doesn't cover. Prints JSON for the requested -Action.
param(
    [Parameter(Mandatory = $true)][ValidateSet('explorer-folder', 'list-windows', 'focus-window', 'close-windows')][string]$Action,
    [Parameter(Mandatory = $true)][string]$CacheDir,
    [long]$Handle
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$source = @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;

namespace CursorRaycast
{
    public class WindowInfo
    {
        public long handle;
        public string title;
    }

    public static class Native
    {
        private delegate bool EnumWindowsProc(IntPtr hwnd, IntPtr lParam);

        [DllImport("user32.dll")] private static extern bool EnumWindows(EnumWindowsProc callback, IntPtr lParam);
        [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr hwnd);
        [DllImport("user32.dll")] private static extern bool IsIconic(IntPtr hwnd);
        [DllImport("user32.dll")] private static extern int GetWindowLong(IntPtr hwnd, int index);
        [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
        [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr hwnd, out RECT rect);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetClassName(IntPtr hwnd, StringBuilder name, int max);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetWindowText(IntPtr hwnd, StringBuilder text, int max);
        [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string className, string title);
        [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr hwnd);
        [DllImport("user32.dll")] private static extern bool ShowWindow(IntPtr hwnd, int command);
        [DllImport("user32.dll")] private static extern void keybd_event(byte key, byte scan, uint flags, UIntPtr extra);
        [DllImport("user32.dll")] private static extern bool PostMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);
        [DllImport("dwmapi.dll")] private static extern int DwmGetWindowAttribute(IntPtr hwnd, int attribute, out int value, int size);

        [StructLayout(LayoutKind.Sequential)]
        private struct RECT { public int Left, Top, Right, Bottom; }

        [ComImport, Guid("6D5140C1-7436-11CE-8034-00AA006009FA"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface IServiceProvider
        {
            [PreserveSig] int QueryService(ref Guid service, ref Guid riid, [MarshalAs(UnmanagedType.IUnknown)] out object result);
        }

        // Only the first vtable slot (IOleWindow.GetWindow) is used.
        [ComImport, Guid("000214E2-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        private interface IShellBrowser
        {
            [PreserveSig] int GetWindow(out IntPtr hwnd);
        }

        private const int GWL_EXSTYLE = -20;
        private const int WS_EX_TOOLWINDOW = 0x80;
        private const int WS_EX_TOPMOST = 0x8;
        private const int DWMWA_CLOAKED = 14;
        private const int SW_RESTORE = 9;
        private const byte VK_MENU = 0x12;
        private const uint KEYEVENTF_KEYUP = 0x2;
        private const uint WM_CLOSE = 0x10;

        private static string ClassOf(IntPtr hwnd)
        {
            var name = new StringBuilder(256);
            GetClassName(hwnd, name, name.Capacity);
            return name.ToString();
        }

        private static string TitleOf(IntPtr hwnd)
        {
            var title = new StringBuilder(1024);
            GetWindowText(hwnd, title, title.Capacity);
            return title.ToString();
        }

        private static string ProcessNameOf(IntPtr hwnd)
        {
            uint pid;
            GetWindowThreadProcessId(hwnd, out pid);
            try { return Process.GetProcessById((int)pid).ProcessName; }
            catch { return ""; }
        }

        private static bool IsAppWindow(IntPtr hwnd, bool allowMinimized)
        {
            if (!IsWindowVisible(hwnd) || (!allowMinimized && IsIconic(hwnd))) return false;
            int exStyle = GetWindowLong(hwnd, GWL_EXSTYLE);
            if ((exStyle & (WS_EX_TOOLWINDOW | WS_EX_TOPMOST)) != 0) return false;
            int cloaked;
            if (DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, out cloaked, sizeof(int)) == 0 && cloaked != 0) return false;
            RECT rect;
            return GetWindowRect(hwnd, out rect) && rect.Right > rect.Left && rect.Bottom > rect.Top;
        }

        public static IntPtr PreviousExplorerWindow()
        {
            IntPtr found = IntPtr.Zero;
            EnumWindows((hwnd, _) =>
            {
                if (!IsAppWindow(hwnd, false) || ProcessNameOf(hwnd).StartsWith("Raycast", StringComparison.OrdinalIgnoreCase)) return true;
                if (ClassOf(hwnd) == "CabinetWClass") found = hwnd;
                return false; // EnumWindows walks the z-order top-down; stop at the first real window.
            }, IntPtr.Zero);
            return found;
        }

        public static IntPtr ActiveTab(IntPtr explorer)
        {
            return FindWindowEx(explorer, IntPtr.Zero, "ShellTabWindowClass", null);
        }

        public static IntPtr TabOf(object shellWindow)
        {
            var provider = shellWindow as IServiceProvider;
            if (provider == null) return IntPtr.Zero;
            var topLevelBrowser = new Guid("4C96BE40-915C-11CF-99D3-00AA004AE837");
            var shellBrowserId = typeof(IShellBrowser).GUID;
            object result;
            if (provider.QueryService(ref topLevelBrowser, ref shellBrowserId, out result) != 0) return IntPtr.Zero;
            var browser = result as IShellBrowser;
            IntPtr tab;
            return browser != null && browser.GetWindow(out tab) == 0 ? tab : IntPtr.Zero;
        }

        public static List<WindowInfo> AppWindows(string processName)
        {
            var windows = new List<WindowInfo>();
            EnumWindows((hwnd, _) =>
            {
                if (IsAppWindow(hwnd, true) && ProcessNameOf(hwnd).Equals(processName, StringComparison.OrdinalIgnoreCase))
                {
                    var title = TitleOf(hwnd);
                    if (title.Length > 0) windows.Add(new WindowInfo { handle = hwnd.ToInt64(), title = title });
                }
                return true;
            }, IntPtr.Zero);
            return windows;
        }

        public static bool Focus(IntPtr hwnd)
        {
            if (IsIconic(hwnd)) ShowWindow(hwnd, SW_RESTORE);
            // A synthetic Alt press lets a background process change the foreground window.
            keybd_event(VK_MENU, 0, 0, UIntPtr.Zero);
            keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
            return SetForegroundWindow(hwnd);
        }

        public static int CloseAll(string processName)
        {
            var windows = AppWindows(processName);
            foreach (var window in windows) PostMessage(new IntPtr(window.handle), WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
            return windows.Count;
        }
    }
}
'@

$assembly = Join-Path $CacheDir 'CursorRaycast.Native.v2.dll'
if (-not ('CursorRaycast.Native' -as [type])) {
    if (-not (Test-Path -LiteralPath $assembly)) {
        New-Item -ItemType Directory -Force -Path $CacheDir | Out-Null
        Add-Type -TypeDefinition $source -OutputAssembly $assembly -OutputType Library
    }
    Add-Type -LiteralPath $assembly
}

switch ($Action) {
    'explorer-folder' {
        $result = [ordered]@{ folder = $null }
        $explorer = [CursorRaycast.Native]::PreviousExplorerWindow()
        if ($explorer -ne [IntPtr]::Zero) {
            $windows = @((New-Object -ComObject Shell.Application).Windows() | Where-Object {
                try { [int64]$_.HWND -eq $explorer.ToInt64() } catch { $false }
            })
            $window = $windows | Select-Object -First 1
            if ($windows.Count -gt 1) {
                $activeTab = [CursorRaycast.Native]::ActiveTab($explorer)
                $active = $windows | Where-Object { [CursorRaycast.Native]::TabOf($_) -eq $activeTab } | Select-Object -First 1
                if ($active) { $window = $active }
            }
            if ($window) {
                # Virtual locations such as "This PC" have shell paths like "::{20D04FE0-...}"; skip those.
                $folder = $window.Document.Folder.Self.Path
                if ($folder -and -not $folder.StartsWith('::')) { $result.folder = $folder }
            }
        }
        ConvertTo-Json -InputObject $result -Compress
    }
    'list-windows' {
        ConvertTo-Json -InputObject @([CursorRaycast.Native]::AppWindows('Cursor')) -Compress
    }
    'focus-window' {
        ConvertTo-Json -InputObject ([CursorRaycast.Native]::Focus([IntPtr]::new($Handle))) -Compress
    }
    'close-windows' {
        ConvertTo-Json -InputObject ([CursorRaycast.Native]::CloseAll('Cursor')) -Compress
    }
}
