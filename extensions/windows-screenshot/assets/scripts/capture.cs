using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

public class Program {
    public const string MUTEX_NAME = "RaycastScreenshotExtensionSingleInstanceMutex";
    public const string CANCEL_EVENT_NAME = "RaycastScreenshotExtensionCancelEvent";

    [STAThread]
    public static void Main(string[] args) {
        bool createdNew;
        using (Mutex mutex = new Mutex(true, MUTEX_NAME, out createdNew)) {
            if (!createdNew) {
                // An active capture overlay is ALREADY running on desktop!
                // Signal the existing instance to close/cancel and exit immediately.
                try {
                    using (EventWaitHandle cancelEvent = EventWaitHandle.OpenExisting(CANCEL_EVENT_NAME)) {
                        cancelEvent.Set();
                    }
                } catch {}
                Console.WriteLine("CANCELLED");
                return;
            }

            using (EventWaitHandle cancelEvent = new EventWaitHandle(false, EventResetMode.AutoReset, CANCEL_EVENT_NAME)) {
                ThreadPool.QueueUserWorkItem((state) => {
                    if (cancelEvent.WaitOne()) {
                        Form activeForm = Application.OpenForms.Count > 0 ? Application.OpenForms[0] : null;
                        if (activeForm != null && !activeForm.IsDisposed) {
                            try {
                                activeForm.BeginInvoke(new Action(() => {
                                    activeForm.DialogResult = DialogResult.Cancel;
                                    activeForm.Close();
                                }));
                            } catch {}
                        }
                    }
                });

                RunCapture(args);
            }
        }
    }

    private static void RunCapture(string[] args) {
        string mode = "region";
        string savePath = "";
        bool copyToClipboard = false;
        int delayMs = 0;
        bool showMagnifier = true;

        for (int i = 0; i < args.Length; i++) {
            string arg = args[i];
            if (arg.Equals("-Mode", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) {
                mode = args[++i].ToLower();
            } else if (arg.Equals("-SavePath", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) {
                savePath = args[++i];
            } else if (arg.Equals("-CopyToClipboard", StringComparison.OrdinalIgnoreCase)) {
                copyToClipboard = true;
            } else if (arg.Equals("-DelayMs", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length) {
                int.TryParse(args[++i], out delayMs);
            } else if (arg.Equals("-ShowMagnifier", StringComparison.OrdinalIgnoreCase)) {
                bool val;
                if (i + 1 < args.Length && bool.TryParse(args[i + 1], out val)) {
                    showMagnifier = val;
                    i++;
                } else {
                    showMagnifier = true;
                }
            }
        }

        if (mode == "focusraycast") {
            Process[] procs = Process.GetProcessesByName("Raycast");
            foreach (Process p in procs) {
                if (p.MainWindowHandle != IntPtr.Zero) {
                    NativeCapture.SetForegroundWindow(p.MainWindowHandle);
                    break;
                }
            }
            return;
        }

        if (mode == "pickfile") {
            try {
                System.Windows.Forms.OpenFileDialog dialog = new System.Windows.Forms.OpenFileDialog();
                dialog.Title = "Select Image for Text Extraction";
                dialog.Filter = "Image Files (*.png;*.jpg;*.jpeg;*.bmp;*.webp)|*.png;*.jpg;*.jpeg;*.bmp;*.webp|All Files (*.*)|*.*";
                dialog.Multiselect = false;
                dialog.CheckFileExists = true;

                System.Windows.Forms.DialogResult res = dialog.ShowDialog();

                Process[] procs = Process.GetProcessesByName("Raycast");
                foreach (Process p in procs) {
                    if (p.MainWindowHandle != IntPtr.Zero) {
                        NativeCapture.SetForegroundWindow(p.MainWindowHandle);
                        break;
                    }
                }

                if (res == System.Windows.Forms.DialogResult.OK && !string.IsNullOrEmpty(dialog.FileName)) {
                    Console.WriteLine("SELECTED|" + dialog.FileName);
                } else {
                    Console.WriteLine("CANCELLED");
                }
            } catch (Exception ex) {
                Console.WriteLine("ERROR|" + ex.Message);
            }
            return;
        }

        try {
            NativeCapture.EnableDpiAwareness();

            if (delayMs > 0) {
                Thread.Sleep(delayMs);
            }

            Bitmap capturedBmp = null;

            if (mode == "screen") {
                // Immediate full screen capture - NO OVERLAY, NO SPACEBAR SWITCHING
                Rectangle bounds = NativeCapture.GetVirtualScreenBounds();
                capturedBmp = NativeCapture.CaptureBounds(bounds);
            } else {
                Bitmap desktopBmp = NativeCapture.CaptureBounds(NativeCapture.GetVirtualScreenBounds());
                CaptureOverlayMode initialMode = (mode == "window") ? CaptureOverlayMode.Window : CaptureOverlayMode.Region;

                using (CaptureOverlayForm form = new CaptureOverlayForm(desktopBmp, initialMode, showMagnifier)) {
                    DialogResult res = form.ShowDialog();
                    if (form.IsCancelled || form.CroppedResult == null) {
                        Console.WriteLine("CANCELLED");
                        desktopBmp.Dispose();
                        return;
                    }
                    capturedBmp = form.CroppedResult;
                }

                desktopBmp.Dispose();
            }

            if (capturedBmp == null) {
                Console.WriteLine("ERROR|Failed to capture bitmap");
                return;
            }

            bool saved = false;
            bool copied = false;

            if (!string.IsNullOrEmpty(savePath)) {
                string targetDir = savePath;
                if (savePath.Equals("DEFAULT", StringComparison.OrdinalIgnoreCase)) {
                    targetDir = NativeCapture.GetWindowsScreenshotsFolder();
                }

                string fullSavePath = "";
                if (Directory.Exists(targetDir) || !targetDir.EndsWith(".png", StringComparison.OrdinalIgnoreCase)) {
                    fullSavePath = NativeCapture.GenerateScreenshotFilePath(targetDir);
                } else {
                    fullSavePath = Path.GetFullPath(targetDir);
                }

                string dir = Path.GetDirectoryName(fullSavePath);
                if (!Directory.Exists(dir)) {
                    Directory.CreateDirectory(dir);
                }

                capturedBmp.Save(fullSavePath, ImageFormat.Png);
                savePath = fullSavePath;
                saved = true;
            }

            if (copyToClipboard) {
                Clipboard.SetImage(capturedBmp);
                copied = true;
            }

            int w = capturedBmp.Width;
            int h = capturedBmp.Height;
            capturedBmp.Dispose();

            if (saved && copied) {
                Console.WriteLine("SUCCESS|SAVED_AND_COPIED|" + savePath + "|" + w + "|" + h);
            } else if (saved) {
                Console.WriteLine("SUCCESS|SAVED|" + savePath + "|" + w + "|" + h);
            } else if (copied) {
                Console.WriteLine("SUCCESS|COPIED|" + w + "|" + h);
            } else {
                Console.WriteLine("ERROR|No action performed");
            }
        } catch (Exception ex) {
            Console.WriteLine("ERROR|" + ex.ToString());
        }
    }
}

public class WindowDetector {
    [DllImport("user32.dll")]
    public static extern IntPtr GetShellWindow();

    [DllImport("user32.dll")]
    public static extern IntPtr GetDesktopWindow();

    [DllImport("user32.dll")]
    public static extern IntPtr WindowFromPoint(NativeCapture.POINT Point);

    [DllImport("user32.dll")]
    public static extern IntPtr GetAncestor(IntPtr hwnd, uint flags);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool IsIconic(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out NativeCapture.RECT lpRect);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern int GetClassName(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("dwmapi.dll")]
    public static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out NativeCapture.RECT pvAttribute, int cbAttribute);

    [DllImport("dwmapi.dll")]
    public static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out int pvAttribute, int cbAttribute);

    public const uint GA_ROOTOWNER = 3;
    public const int GWL_EXSTYLE = -20;
    public const uint WS_EX_TOOLWINDOW = 0x00000080;
    public const int DWMWA_EXTENDED_FRAME_BOUNDS = 9;
    public const int DWMWA_CLOAKED = 14;

    public class DiscoveredWindow {
        public IntPtr Handle;
        public Rectangle Bounds;
        public string Title;
    }

    public static bool IsDesktopOrShellWindow(IntPtr hWnd) {
        if (hWnd == IntPtr.Zero) return true;
        if (hWnd == GetShellWindow() || hWnd == GetDesktopWindow()) return true;

        StringBuilder classSb = new StringBuilder(256);
        GetClassName(hWnd, classSb, 256);
        string className = classSb.ToString();

        if (className == "Progman" || className == "WorkerW" || className == "Shell_TrayWnd" || 
            className == "Shell_SecondaryTrayWnd" || className == "SysListView32" || 
            className == "FolderView" || className == "Shell_LightDismissOverlay") {
            return true;
        }

        StringBuilder titleSb = new StringBuilder(256);
        GetWindowText(hWnd, titleSb, 256);
        string title = titleSb.ToString().Trim();

        if (title == "Program Manager" || title == "Desktop") {
            return true;
        }

        return false;
    }

    public static bool IsValidAppWindow(IntPtr hWnd, uint myPid) {
        if (hWnd == IntPtr.Zero) return false;
        if (IsDesktopOrShellWindow(hWnd)) return false;
        if (!IsWindowVisible(hWnd) || IsIconic(hWnd)) return false;

        int cloaked = 0;
        int cloakRes = DwmGetWindowAttribute(hWnd, DWMWA_CLOAKED, out cloaked, sizeof(int));
        if (cloakRes == 0 && cloaked != 0) {
            return false;
        }

        uint pId;
        GetWindowThreadProcessId(hWnd, out pId);
        if (pId == myPid) return false;

        int exStyle = GetWindowLong(hWnd, GWL_EXSTYLE);
        if ((exStyle & (int)WS_EX_TOOLWINDOW) != 0) return false;

        StringBuilder classSb = new StringBuilder(256);
        GetClassName(hWnd, classSb, 256);
        string className = classSb.ToString();

        if (className == "Windows.UI.Core.CoreWindow" || className == "SideBar" || 
            className == "MultitaskingViewFrame") {
            return false;
        }

        StringBuilder titleSb = new StringBuilder(256);
        GetWindowText(hWnd, titleSb, 256);
        string title = titleSb.ToString().Trim();

        if (string.IsNullOrEmpty(title) || title == "Windows Input Experience" || title == "Taskbar" || 
            title == "Cortana" || title == "Search" || title == "Start" || title == "Snap Assist") {
            return false;
        }

        NativeCapture.RECT r;
        int res = DwmGetWindowAttribute(hWnd, DWMWA_EXTENDED_FRAME_BOUNDS, out r, Marshal.SizeOf(typeof(NativeCapture.RECT)));
        if (res != 0) GetWindowRect(hWnd, out r);

        int w = r.Right - r.Left;
        int h = r.Bottom - r.Top;

        if (w < 80 || h < 80) return false;

        return true;
    }

    public static DiscoveredWindow FindWindowUnderCursor(Point screenPt) {
        uint myPid = (uint)Process.GetCurrentProcess().Id;

        // Stage 1: Try WindowFromPoint + GetAncestor GA_ROOTOWNER
        NativeCapture.POINT pt = new NativeCapture.POINT(screenPt.X, screenPt.Y);
        IntPtr rawHWnd = WindowFromPoint(pt);

        if (rawHWnd != IntPtr.Zero) {
            IntPtr rootWnd = GetAncestor(rawHWnd, GA_ROOTOWNER);
            if (rootWnd == IntPtr.Zero) rootWnd = rawHWnd;

            // Only if mouse is directly over the Desktop background or Taskbar, return null so we don't pick underlying windows
            if (IsDesktopOrShellWindow(rawHWnd) || IsDesktopOrShellWindow(rootWnd)) {
                return null;
            }

            if (IsValidAppWindow(rootWnd, myPid)) {
                NativeCapture.RECT r;
                int res = DwmGetWindowAttribute(rootWnd, DWMWA_EXTENDED_FRAME_BOUNDS, out r, Marshal.SizeOf(typeof(NativeCapture.RECT)));
                if (res != 0) GetWindowRect(rootWnd, out r);

                StringBuilder sb = new StringBuilder(256);
                GetWindowText(rootWnd, sb, 256);
                string t = sb.ToString();

                return new DiscoveredWindow {
                    Handle = rootWnd,
                    Bounds = new Rectangle(r.Left, r.Top, r.Right - r.Left, r.Bottom - r.Top),
                    Title = string.IsNullOrEmpty(t) ? "Application Window" : t
                };
            }
        }

        // Stage 2: Fallback to EnumWindows Z-order search for normal application windows
        DiscoveredWindow match = null;

        NativeCapture.EnumWindows((hWnd, lParam) => {
            if (IsValidAppWindow(hWnd, myPid)) {
                NativeCapture.RECT r;
                int res = DwmGetWindowAttribute(hWnd, DWMWA_EXTENDED_FRAME_BOUNDS, out r, Marshal.SizeOf(typeof(NativeCapture.RECT)));
                if (res != 0) GetWindowRect(hWnd, out r);

                if (r.Left <= screenPt.X && screenPt.X <= r.Right && r.Top <= screenPt.Y && screenPt.Y <= r.Bottom) {
                    StringBuilder sb = new StringBuilder(256);
                    GetWindowText(hWnd, sb, 256);
                    string t = sb.ToString();

                    match = new DiscoveredWindow {
                        Handle = hWnd,
                        Bounds = new Rectangle(r.Left, r.Top, r.Right - r.Left, r.Bottom - r.Top),
                        Title = string.IsNullOrEmpty(t) ? "Application Window" : t
                    };
                    return false; // Stop enumeration
                }
            }
            return true;
        }, IntPtr.Zero);

        return match;
    }
}

public class NativeCapture {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("shell32.dll")]
    public static extern int SHGetKnownFolderPath([MarshalAs(UnmanagedType.LPStruct)] Guid rfid, uint dwFlags, IntPtr hToken, out IntPtr pszPath);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc enumProc, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool PrintWindow(IntPtr hwnd, IntPtr hdcBlt, uint nFlags);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr GetWindowDC(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern IntPtr GetDesktopWindow();

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr GetDC(IntPtr hWnd);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int ReleaseDC(IntPtr hWnd, IntPtr hDC);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern IntPtr CreateCompatibleDC(IntPtr hdc);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern IntPtr CreateCompatibleBitmap(IntPtr hdc, int nWidth, int nHeight);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern IntPtr SelectObject(IntPtr hdc, IntPtr hgdiobj);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern bool BitBlt(IntPtr hdcDest, int nXDest, int nYDest, int nWidth, int nHeight, IntPtr hdcSrc, int nXSrc, int nYSrc, uint dwRop);

    [DllImport("gdi32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern IntPtr CreateDC(string lpszDriver, string lpszDevice, string lpszOutput, IntPtr lpInitData);

    public const uint SRCCOPY = 0x00CC0020;
    public const uint CAPTUREBLT = 0x40000000;

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern bool DeleteDC(IntPtr hdc);

    [DllImport("gdi32.dll", SetLastError = true)]
    public static extern bool DeleteObject(IntPtr hObject);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    public static extern bool SetProcessDpiAwarenessContext(IntPtr dpiContext);

    [DllImport("user32.dll")]
    public static extern bool SetProcessDPIAware();

    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool BringWindowToTop(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    public const int WH_KEYBOARD_LL = 13;
    public const int WM_KEYDOWN = 0x0100;
    public const int WM_KEYUP = 0x0101;
    public const int WM_SYSKEYDOWN = 0x0104;
    public const int WM_SYSKEYUP = 0x0105;

    public delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll")]
    public static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool AttachThreadInput(uint idAttach, uint idAttachTo, bool fAttach);

    [DllImport("user32.dll")]
    public static extern IntPtr SetFocus(IntPtr hWnd);

    [DllImport("kernel32.dll")]
    public static extern uint GetCurrentThreadId();

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    public static extern IntPtr GetModuleHandle(string lpModuleName);

    public static readonly Guid FOLDERID_Screenshots = new Guid("b7bede81-df94-4682-a7d9-57a526374b49");
    public static readonly IntPtr HWND_TOPMOST = new IntPtr(-1);
    public const uint SWP_SHOWWINDOW = 0x0040;
    public const uint SWP_NOMOVE = 0x0002;
    public const uint SWP_NOSIZE = 0x0001;
    public const int SW_SHOW = 5;

    public const uint PW_RENDERFULLCONTENT = 0x0002;
    public static readonly IntPtr DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2 = (IntPtr)(-4);

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
        public int X;
        public int Y;
        public POINT(int x, int y) { X = x; Y = y; }
    }

    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    public class WindowEntry {
        public IntPtr Handle;
        public Rectangle Bounds;
        public string Title;
    }

    private static bool isDpiInitialized = false;

    public static void EnableDpiAwareness() {
        if (isDpiInitialized) return;
        isDpiInitialized = true;

        try {
            SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2);
        } catch {
            try { SetProcessDPIAware(); } catch {}
        }
    }

    public static string GetWindowsScreenshotsFolder() {
        IntPtr pathPtr;
        int hr = SHGetKnownFolderPath(FOLDERID_Screenshots, 0, IntPtr.Zero, out pathPtr);
        if (hr == 0 && pathPtr != IntPtr.Zero) {
            string knownPath = Marshal.PtrToStringUni(pathPtr);
            Marshal.FreeCoTaskMem(pathPtr);
            if (!string.IsNullOrEmpty(knownPath) && Directory.Exists(knownPath)) {
                return knownPath;
            }
        }

        string pictures = Environment.GetFolderPath(Environment.SpecialFolder.MyPictures);
        string cand1 = Path.Combine(pictures, "Screenshots 1");
        if (Directory.Exists(cand1)) return cand1;

        string cand2 = Path.Combine(pictures, "Screenshots");
        if (Directory.Exists(cand2)) return cand2;

        return Path.Combine(pictures, "Screenshots");
    }

    public static string GenerateScreenshotFilePath(string dir) {
        if (!Directory.Exists(dir)) {
            Directory.CreateDirectory(dir);
        }
        DateTime now = DateTime.Now;
        string timestamp = now.ToString("yyyy-MM-dd HH-mm-ss");
        string baseName = "Screenshot " + timestamp;
        string fullPath = Path.Combine(dir, baseName + ".png");
        int counter = 1;

        while (File.Exists(fullPath)) {
            fullPath = Path.Combine(dir, string.Format("{0} ({1}).png", baseName, counter));
            counter++;
        }
        return fullPath;
    }

    public static void ForceForegroundWindow(IntPtr hWnd) {
        try {
            IntPtr foreWnd = GetForegroundWindow();
            uint foreThread = 0;
            if (foreWnd != IntPtr.Zero) {
                GetWindowThreadProcessId(foreWnd, out foreThread);
            }
            uint appThread = GetCurrentThreadId();

            if (foreThread != 0 && foreThread != appThread) {
                AttachThreadInput(appThread, foreThread, true);
                SetWindowPos(hWnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_SHOWWINDOW | SWP_NOMOVE | SWP_NOSIZE);
                ShowWindow(hWnd, SW_SHOW);
                SetForegroundWindow(hWnd);
                BringWindowToTop(hWnd);
                SetFocus(hWnd);
                AttachThreadInput(appThread, foreThread, false);
            } else {
                SetWindowPos(hWnd, HWND_TOPMOST, 0, 0, 0, 0, SWP_SHOWWINDOW | SWP_NOMOVE | SWP_NOSIZE);
                ShowWindow(hWnd, SW_SHOW);
                SetForegroundWindow(hWnd);
                BringWindowToTop(hWnd);
                SetFocus(hWnd);
            }
        } catch {}
    }

    public static Bitmap CaptureBounds(Rectangle bounds) {
        EnableDpiAwareness();
        IntPtr hdcScreen = GetDC(IntPtr.Zero);
        Bitmap bmp = new Bitmap(bounds.Width, bounds.Height, PixelFormat.Format32bppArgb);
        using (Graphics g = Graphics.FromImage(bmp)) {
            IntPtr hdcBmp = g.GetHdc();
            bool ok = BitBlt(hdcBmp, 0, 0, bounds.Width, bounds.Height, hdcScreen, bounds.X, bounds.Y, SRCCOPY | CAPTUREBLT);
            if (!ok) {
                BitBlt(hdcBmp, 0, 0, bounds.Width, bounds.Height, hdcScreen, bounds.X, bounds.Y, SRCCOPY);
            }
            g.ReleaseHdc(hdcBmp);
        }
        ReleaseDC(IntPtr.Zero, hdcScreen);
        return bmp;
    }

    public static Bitmap CaptureSpecificWindow(IntPtr hWnd, Rectangle bounds) {
        EnableDpiAwareness();

        int width = bounds.Width;
        int height = bounds.Height;

        if (width <= 0 || height <= 0 || hWnd == IntPtr.Zero) {
            return CaptureBounds(bounds);
        }

        IntPtr hdcScreen = GetDC(IntPtr.Zero);
        IntPtr hdcMem = CreateCompatibleDC(hdcScreen);
        IntPtr hBitmap = CreateCompatibleBitmap(hdcScreen, width, height);
        IntPtr hOld = SelectObject(hdcMem, hBitmap);

        bool success = PrintWindow(hWnd, hdcMem, PW_RENDERFULLCONTENT);
        if (!success) {
            success = PrintWindow(hWnd, hdcMem, 0);
        }

        Bitmap bmp = null;
        if (success) {
            bmp = Image.FromHbitmap(hBitmap);
        }

        SelectObject(hdcMem, hOld);
        DeleteObject(hBitmap);
        DeleteDC(hdcMem);
        ReleaseDC(IntPtr.Zero, hdcScreen);

        if (bmp != null) {
            return bmp;
        }

        return CaptureBounds(bounds);
    }

    public static Rectangle GetVirtualScreenBounds() {
        return SystemInformation.VirtualScreen;
    }
}

public enum CaptureOverlayMode {
    Region,
    Window
}

public class CaptureOverlayForm : Form {
    private Bitmap fullScreenBmp;
    private CaptureOverlayMode currentMode;

    // Region mode state
    private Point startPoint;
    private Rectangle selectionRect;
    private bool isSelecting = false;

    // Window mode state
    private NativeCapture.WindowEntry selectedWindow = null;

    // Global keyboard hook state for hotkey focus resilience
    private IntPtr hookId = IntPtr.Zero;
    private NativeCapture.LowLevelKeyboardProc hookProc;

    public Bitmap CroppedResult { get; private set; }
    public bool IsCancelled { get; private set; }

    private Point currentMousePoint = Point.Empty;
    private bool showMagnifier = true;

    protected override CreateParams CreateParams {
        get {
            CreateParams cp = base.CreateParams;
            cp.Style |= unchecked((int)0x80000000); // WS_POPUP
            cp.Style &= ~0x00C00000; // remove WS_CAPTION
            cp.Style &= ~0x00040000; // remove WS_SIZEBOX
            cp.ExStyle |= 0x00000008; // WS_EX_TOPMOST
            cp.ExStyle |= 0x00000080; // WS_EX_TOOLWINDOW
            return cp;
        }
    }

    public CaptureOverlayForm(Bitmap desktopImage, CaptureOverlayMode initialMode, bool showMagnifier = true) {
        this.fullScreenBmp = desktopImage;
        this.currentMode = initialMode;
        this.showMagnifier = showMagnifier;
        this.IsCancelled = true;
        Rectangle vBounds = SystemInformation.VirtualScreen;

        this.SetStyle(
            ControlStyles.AllPaintingInWmPaint |
            ControlStyles.UserPaint |
            ControlStyles.OptimizedDoubleBuffer |
            ControlStyles.Opaque,
            true
        );
        this.StartPosition = FormStartPosition.Manual;
        this.Location = vBounds.Location;
        this.Size = vBounds.Size;
        this.FormBorderStyle = FormBorderStyle.None;
        this.TopMost = true;
        this.ShowInTaskbar = false;
        this.DoubleBuffered = true;
        this.Cursor = (initialMode == CaptureOverlayMode.Region) ? Cursors.Cross : Cursors.Hand;
        this.KeyPreview = true;

        this.MouseDown += OnMouseDown;
        this.MouseMove += OnMouseMove;
        this.MouseUp += OnMouseUp;
        this.KeyDown += OnKeyDown;
        this.Paint += OnPaint;

        try {
            hookProc = HookCallback;
            hookId = NativeCapture.SetWindowsHookEx(
                NativeCapture.WH_KEYBOARD_LL,
                hookProc,
                NativeCapture.GetModuleHandle(null),
                0
            );
        } catch {}
    }

    protected override void OnFormClosing(FormClosingEventArgs e) {
        base.OnFormClosing(e);
        if (hookId != IntPtr.Zero) {
            NativeCapture.UnhookWindowsHookEx(hookId);
            hookId = IntPtr.Zero;
        }
    }

    private long lastToggleTime = 0;

    private void ToggleMode() {
        long now = DateTime.UtcNow.Ticks / TimeSpan.TicksPerMillisecond;
        if (now - lastToggleTime < 150) return; // Prevent double-triggering
        lastToggleTime = now;

        if (currentMode == CaptureOverlayMode.Region) {
            currentMode = CaptureOverlayMode.Window;
            isSelecting = false;
            selectionRect = Rectangle.Empty;
            this.Cursor = Cursors.Hand;
            UpdateHoveredWindow();
        } else {
            currentMode = CaptureOverlayMode.Region;
            selectedWindow = null;
            this.Cursor = Cursors.Cross;
        }
        this.Invalidate();
    }

    private void CancelCapture() {
        IsCancelled = true;
        this.DialogResult = DialogResult.Cancel;
        this.Close();
    }

    private IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0) {
            int msg = wParam.ToInt32();
            if (msg == NativeCapture.WM_KEYDOWN || msg == NativeCapture.WM_SYSKEYDOWN) {
                int vkCode = Marshal.ReadInt32(lParam);
                if (vkCode == (int)Keys.Escape) {
                    this.BeginInvoke((Action)(() => CancelCapture()));
                    return (IntPtr)1; // Consume key down completely
                } else if (vkCode == (int)Keys.Space) {
                    this.BeginInvoke((Action)(() => ToggleMode()));
                    return (IntPtr)1; // Consume key down completely
                }
            } else if (msg == NativeCapture.WM_KEYUP || msg == NativeCapture.WM_SYSKEYUP) {
                int vkCode = Marshal.ReadInt32(lParam);
                if (vkCode == (int)Keys.Escape || vkCode == (int)Keys.Space) {
                    return (IntPtr)1; // Consume key up completely so underlying application never receives it
                }
            }
        }
        return NativeCapture.CallNextHookEx(hookId, nCode, wParam, lParam);
    }

    protected override void OnPaintBackground(PaintEventArgs e) {
        // Do nothing to eliminate WM_ERASEBKGND white/gray erase flicker
    }

    private void UpdateHoveredWindow() {
        if (currentMode != CaptureOverlayMode.Window) return;

        Point screenPt = Cursor.Position;
        WindowDetector.DiscoveredWindow win = WindowDetector.FindWindowUnderCursor(screenPt);

        if (win != null) {
            if (selectedWindow == null || selectedWindow.Handle != win.Handle || selectedWindow.Bounds != win.Bounds) {
                selectedWindow = new NativeCapture.WindowEntry {
                    Handle = win.Handle,
                    Bounds = win.Bounds,
                    Title = win.Title
                };
                this.Invalidate();
            }
        } else if (selectedWindow != null) {
            selectedWindow = null;
            this.Invalidate();
        }
    }

    protected override void OnShown(EventArgs e) {
        base.OnShown(e);
        currentMousePoint = this.PointToClient(Cursor.Position);
        NativeCapture.ForceForegroundWindow(this.Handle);
        this.Activate();
        this.Focus();
        if (currentMode == CaptureOverlayMode.Window) {
            UpdateHoveredWindow();
        }
    }

    protected override void OnActivated(EventArgs e) {
        base.OnActivated(e);
        NativeCapture.ForceForegroundWindow(this.Handle);
    }

    private void OnKeyDown(object sender, KeyEventArgs e) {
        if (e.KeyCode == Keys.Escape) {
            e.Handled = true;
            e.SuppressKeyPress = true;
            CancelCapture();
        } else if (e.KeyCode == Keys.Space) {
            e.Handled = true;
            e.SuppressKeyPress = true;
            ToggleMode();
        }
    }

    private void OnMouseDown(object sender, MouseEventArgs e) {
        if (e.Button == MouseButtons.Right) {
            IsCancelled = true;
            this.DialogResult = DialogResult.Cancel;
            this.Close();
            return;
        }

        if (e.Button == MouseButtons.Left) {
            if (currentMode == CaptureOverlayMode.Region) {
                isSelecting = true;
                startPoint = e.Location;
                selectionRect = new Rectangle(e.X, e.Y, 0, 0);
                this.Invalidate();
            } else if (currentMode == CaptureOverlayMode.Window) {
                this.Hide(); // Instantly unbind overlay from DWM composition stack

                if (selectedWindow != null && selectedWindow.Handle != IntPtr.Zero) {
                    CroppedResult = NativeCapture.CaptureSpecificWindow(selectedWindow.Handle, selectedWindow.Bounds);
                    if (CroppedResult != null) {
                        IsCancelled = false;
                        this.DialogResult = DialogResult.OK;
                    } else {
                        IsCancelled = true;
                        this.DialogResult = DialogResult.Cancel;
                    }
                } else {
                    CroppedResult = fullScreenBmp.Clone(new Rectangle(0, 0, fullScreenBmp.Width, fullScreenBmp.Height), fullScreenBmp.PixelFormat);
                    IsCancelled = false;
                    this.DialogResult = DialogResult.OK;
                }
                this.Close();
            }
        }
    }

    private void OnMouseMove(object sender, MouseEventArgs e) {
        currentMousePoint = e.Location;
        if (currentMode == CaptureOverlayMode.Region) {
            if (isSelecting) {
                int x = Math.Min(startPoint.X, e.X);
                int y = Math.Min(startPoint.Y, e.Y);
                int w = Math.Abs(startPoint.X - e.X);
                int h = Math.Abs(startPoint.Y - e.Y);
                selectionRect = new Rectangle(x, y, w, h);
            }
            this.Invalidate();
        } else if (currentMode == CaptureOverlayMode.Window) {
            UpdateHoveredWindow();
        }
    }

    private void OnMouseUp(object sender, MouseEventArgs e) {
        if (currentMode == CaptureOverlayMode.Region && isSelecting && e.Button == MouseButtons.Left) {
            isSelecting = false;
            if (selectionRect.Width > 4 && selectionRect.Height > 4) {
                Rectangle cropRect = Rectangle.Intersect(
                    new Rectangle(0, 0, fullScreenBmp.Width, fullScreenBmp.Height),
                    selectionRect
                );

                if (cropRect.Width > 0 && cropRect.Height > 0) {
                    CroppedResult = fullScreenBmp.Clone(cropRect, fullScreenBmp.PixelFormat);
                    IsCancelled = false;
                    this.DialogResult = DialogResult.OK;
                } else {
                    IsCancelled = true;
                    this.DialogResult = DialogResult.Cancel;
                }
            } else {
                IsCancelled = true;
                this.DialogResult = DialogResult.Cancel;
            }
            this.Close();
        }
    }

    private void OnPaint(object sender, PaintEventArgs e) {
        e.Graphics.DrawImageUnscaled(fullScreenBmp, 0, 0);
        Rectangle vBounds = SystemInformation.VirtualScreen;

        if (currentMode == CaptureOverlayMode.Region) {
            using (GraphicsPath path = new GraphicsPath()) {
                path.AddRectangle(new Rectangle(0, 0, this.Width, this.Height));
                if (selectionRect.Width > 0 && selectionRect.Height > 0) {
                    path.AddRectangle(selectionRect);
                }

                using (SolidBrush maskBrush = new SolidBrush(Color.FromArgb(120, 0, 0, 0))) {
                    e.Graphics.FillPath(maskBrush, path);
                }
            }

            if (selectionRect.Width > 0 && selectionRect.Height > 0) {
                using (Pen borderPen = new Pen(Color.FromArgb(255, 0, 120, 215), 2)) {
                    e.Graphics.DrawRectangle(borderPen, selectionRect);
                }
            }

            // Render cursor magnifier loupe for Region mode only (if enabled in settings)
            if (showMagnifier) {
                DrawMagnifier(e.Graphics, currentMousePoint, this.Width, this.Height);
            }
        } else if (currentMode == CaptureOverlayMode.Window) {
            Rectangle localTargetRect = Rectangle.Empty;

            if (selectedWindow != null) {
                Rectangle rawB = selectedWindow.Bounds;
                localTargetRect = new Rectangle(rawB.X - vBounds.X, rawB.Y - vBounds.Y, rawB.Width, rawB.Height);
            }

            using (GraphicsPath path = new GraphicsPath()) {
                path.AddRectangle(new Rectangle(0, 0, this.Width, this.Height));
                if (localTargetRect.Width > 0 && localTargetRect.Height > 0) {
                    path.AddRectangle(localTargetRect);
                }

                using (SolidBrush maskBrush = new SolidBrush(Color.FromArgb(120, 0, 0, 0))) {
                    e.Graphics.FillPath(maskBrush, path);
                }
            }

            if (localTargetRect.Width > 0 && localTargetRect.Height > 0) {
                using (Pen borderPen = new Pen(Color.FromArgb(255, 0, 120, 215), 3)) {
                    e.Graphics.DrawRectangle(borderPen, localTargetRect);
                }
            }
        }
    }

    private void DrawMagnifier(Graphics g, Point cursorPt, int formWidth, int formHeight) {
        if (fullScreenBmp == null || cursorPt.IsEmpty || cursorPt.X < 0 || cursorPt.Y < 0) return;

        int zoom = 4;
        int sampleSize = 25; // 25x25 source pixels around cursor (odd number for perfect center symmetry)
        int halfSample = sampleSize / 2; // 12
        int magSize = sampleSize * zoom; // 100x100 px

        int magX = cursorPt.X + 22;
        int magY = cursorPt.Y + 22;

        if (magX + magSize + 10 > formWidth) {
            magX = cursorPt.X - magSize - 22;
        }
        if (magY + magSize + 10 > formHeight) {
            magY = cursorPt.Y - magSize - 22;
        }
        if (magX < 10) magX = 10;
        if (magY < 10) magY = 10;

        Rectangle destRect = new Rectangle(magX, magY, magSize, magSize);
        Rectangle srcRect = new Rectangle(cursorPt.X - halfSample, cursorPt.Y - halfSample, sampleSize, sampleSize);

        int srcX = Math.Max(0, Math.Min(fullScreenBmp.Width - sampleSize, srcRect.X));
        int srcY = Math.Max(0, Math.Min(fullScreenBmp.Height - sampleSize, srcRect.Y));
        srcRect = new Rectangle(srcX, srcY, sampleSize, sampleSize);

        GraphicsState state = g.Save();
        try {
            using (GraphicsPath clipPath = new GraphicsPath()) {
                int radius = 6;
                int d = radius * 2;
                clipPath.AddArc(destRect.X, destRect.Y, d, d, 180, 90);
                clipPath.AddArc(destRect.Right - d, destRect.Y, d, d, 270, 90);
                clipPath.AddArc(destRect.Right - d, destRect.Bottom - d, d, d, 0, 90);
                clipPath.AddArc(destRect.X, destRect.Bottom - d, d, d, 90, 90);
                clipPath.CloseFigure();

                g.SetClip(clipPath);
                g.InterpolationMode = InterpolationMode.NearestNeighbor;
                g.PixelOffsetMode = PixelOffsetMode.Half;

                // Draw pristine magnified pixels directly from raw background
                g.DrawImage(fullScreenBmp, destRect, srcRect, GraphicsUnit.Pixel);

                // Precise pixel coordinates of the center pixel
                int centerPixX = destRect.X + halfSample * zoom;
                int centerPixY = destRect.Y + halfSample * zoom;
                int centerLineX = centerPixX + zoom / 2;
                int centerLineY = centerPixY + zoom / 2;

                // High-precision hairline crosshairs with dark shadow for 100% legibility on any background
                using (Pen shadowPen = new Pen(Color.FromArgb(120, 0, 0, 0), 2f))
                using (Pen crosshairPen = new Pen(Color.FromArgb(240, 0, 180, 255), 1f))
                using (Pen centerBoxPen = new Pen(Color.FromArgb(255, 255, 60, 60), 1f)) {
                    // Full-span horizontal guide line
                    g.DrawLine(shadowPen, destRect.Left, centerLineY, destRect.Right, centerLineY);
                    g.DrawLine(crosshairPen, destRect.Left, centerLineY, destRect.Right, centerLineY);

                    // Full-span vertical guide line
                    g.DrawLine(shadowPen, centerLineX, destRect.Top, centerLineX, destRect.Bottom);
                    g.DrawLine(crosshairPen, centerLineX, destRect.Top, centerLineX, destRect.Bottom);

                    // Center 1x1 target pixel box indicator (framing the exact selection boundary)
                    g.DrawRectangle(shadowPen, centerPixX - 1, centerPixY - 1, zoom + 2, zoom + 2);
                    g.DrawRectangle(centerBoxPen, centerPixX, centerPixY, zoom, zoom);
                }
            }
        } finally {
            g.Restore(state);
        }

        // Clean, subtle border & shadow around the loupe
        using (GraphicsPath borderPath = new GraphicsPath()) {
            int radius = 6;
            int d = radius * 2;
            borderPath.AddArc(destRect.X, destRect.Y, d, d, 180, 90);
            borderPath.AddArc(destRect.Right - d, destRect.Y, d, d, 270, 90);
            borderPath.AddArc(destRect.Right - d, destRect.Bottom - d, d, d, 0, 90);
            borderPath.AddArc(destRect.X, destRect.Bottom - d, d, d, 90, 90);
            borderPath.CloseFigure();

            using (Pen borderPen = new Pen(Color.FromArgb(230, 255, 255, 255), 1.5f))
            using (Pen shadowPen = new Pen(Color.FromArgb(120, 0, 0, 0), 2.5f)) {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.DrawPath(shadowPen, borderPath);
                g.DrawPath(borderPen, borderPath);
            }
        }
    }
}
