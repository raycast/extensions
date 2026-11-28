using System;
using System.Runtime.InteropServices;

// Resolve each Shell automation entry to its own browser/tab window.
// ExplorerTabUtility uses this same Shell service + active-tab handle approach:
// https://github.com/w4po/ExplorerTabUtility/blob/master/ExplorerTabUtility/Hooks/ExplorerWatcher.cs
public static class OwnDropExplorer {
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr FindWindowEx(IntPtr parent, IntPtr after, string className, string title);

    [ComImport, Guid("6D5140C1-7436-11CE-8034-00AA006009FA"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IShellServiceProvider {
        [PreserveSig] int QueryService(ref Guid service, ref Guid iid, [MarshalAs(UnmanagedType.Interface)] out object result);
    }
    [ComImport, Guid("00000114-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IOleWindow {
        [PreserveSig] int GetWindow(out IntPtr window);
        [PreserveSig] int ContextSensitiveHelp([MarshalAs(UnmanagedType.Bool)] bool enterMode);
    }
    public static long ActiveTab(long window) {
        return FindWindowEx(new IntPtr(window), IntPtr.Zero, "ShellTabWindowClass", null).ToInt64();
    }
    public static long BrowserWindow(object shellEntry) {
        object browser = null;
        try {
            Guid service = new Guid("000214E2-0000-0000-C000-000000000046");
            Guid iid = service;
            int hr = ((IShellServiceProvider)shellEntry).QueryService(ref service, ref iid, out browser);
            Marshal.ThrowExceptionForHR(hr);
            IntPtr window;
            Marshal.ThrowExceptionForHR(((IOleWindow)browser).GetWindow(out window));
            return window.ToInt64();
        } finally {
            if (browser != null && Marshal.IsComObject(browser)) Marshal.ReleaseComObject(browser);
        }
    }
}
