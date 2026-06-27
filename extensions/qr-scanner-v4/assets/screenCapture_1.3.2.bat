// 2>nul||@goto :batch
/*
:batch
@echo off
setlocal enableDelayedExpansion

:: find csc.exe
set "csc="
for /r "%SystemRoot%\Microsoft.NET\Framework\" %%# in ("*csc.exe") do  set "csc=%%#"

if not exist "%csc%" (
   echo no .net framework installed
   exit /b 10
)

if not exist "%~n0.exe" (
   call %csc% /nologo /r:"Microsoft.VisualBasic.dll" /win32manifest:"app.manifest" /out:"%~n0.exe" "%~dpsfnx0" || (
      exit /b !errorlevel!
   )
)
%~n0.exe %*
endlocal & exit /b %errorlevel%

*/

// reference
// https://gallery.technet.microsoft.com/scriptcenter/eeff544a-f690-4f6b-a586-11eea6fc5eb8

using System;
using System.Runtime.InteropServices;
using System.Drawing;
using System.Drawing.Imaging;
using System.Collections.Generic;
using Microsoft.VisualBasic;



/// Provides functions to capture the entire screen, or a particular window, and save it to a file.

public class ScreenCapture
{

    static String deviceName = "";
    static Image capturedImage = null;

    /// Creates an Image object containing a screen shot the active window

    public Image CaptureActiveWindow()
    {
        return CaptureWindow(User32.GetForegroundWindow());
    }

    /// Creates an Image object containing a screen shot of the entire desktop

    public Image CaptureScreen()
    {
        if (!deviceName.Equals(""))
        {
            CaptureSpecificWindow();
            if (capturedImage != null)
            {
                return capturedImage;
            }
            Console.WriteLine("Unable to capture image... using main display");
        }
        return CaptureWindow(User32.GetDesktopWindow());
    }

    /// Creates an Image object containing a screen shot of a specific window

    private Image CaptureWindow(IntPtr handle)
    {
        // get te hDC of the target window
        IntPtr hdcSrc = User32.GetWindowDC(handle);
        // get the size
        User32.RECT windowRect = new User32.RECT();
        User32.GetWindowRect(handle, ref windowRect);

        Image img = CaptureWindowFromDC(handle, hdcSrc, windowRect);
        User32.ReleaseDC(handle, hdcSrc);
        return img;
    }
    private static Image CaptureWindowFromDC(IntPtr handle, IntPtr hdcSrc, User32.RECT windowRect){
        // get the size
        int width = windowRect.right - windowRect.left;
        int height = windowRect.bottom - windowRect.top;
        // create a device context we can copy to
        IntPtr hdcDest = GDI32.CreateCompatibleDC(hdcSrc);
        // create a bitmap we can copy it to,
        // using GetDeviceCaps to get the width/height
        IntPtr hBitmap = GDI32.CreateCompatibleBitmap(hdcSrc, width, height);
        // select the bitmap object
        IntPtr hOld = GDI32.SelectObject(hdcDest, hBitmap);
        // bitblt over
        GDI32.BitBlt(hdcDest, 0, 0, width, height, hdcSrc, windowRect.left, windowRect.top, GDI32.SRCCOPY);
        // restore selection
        GDI32.SelectObject(hdcDest, hOld);
        // clean up
        GDI32.DeleteDC(hdcDest);
        // get a .NET image object for it
        Image img = Image.FromHbitmap(hBitmap);
        // free up the Bitmap object
        GDI32.DeleteObject(hBitmap);
        return img;
    }

    public void CaptureActiveWindowToFile(string filename, ImageFormat format)
    {
        Image img = CaptureActiveWindow();
        img.Save(filename, format);
    }

    public void CaptureScreenToFile(string filename, ImageFormat format)
    {
        Image img = CaptureScreen();
        img.Save(filename, format);
    }

    static bool fullscreen = true;
    static String file = "screenshot.bmp";
    static System.Drawing.Imaging.ImageFormat format = System.Drawing.Imaging.ImageFormat.Bmp;
    static String windowTitle = "";
    static List<MonitorInfoWithHandle> _monitorInfos;

    static void parseArguments()
    {
        String[] arguments = Environment.GetCommandLineArgs();
        if (arguments.Length == 1)
        {
            printHelp();
            Environment.Exit(0);
        }
        if (arguments[1].ToLower().Equals("/h") || arguments[1].ToLower().Equals("/help"))
        {
            printHelp();
            Environment.Exit(0);
        }
        if (arguments[1].ToLower().Equals("/l") || arguments[1].ToLower().Equals("/list"))
        {
            PrintMonitorInfo();
            Environment.Exit(0);
        }

        file = arguments[1];
        Dictionary<String, System.Drawing.Imaging.ImageFormat> formats =
        new Dictionary<String, System.Drawing.Imaging.ImageFormat>();

        formats.Add("bmp", System.Drawing.Imaging.ImageFormat.Bmp);
        formats.Add("emf", System.Drawing.Imaging.ImageFormat.Emf);
        formats.Add("exif", System.Drawing.Imaging.ImageFormat.Exif);
        formats.Add("jpg", System.Drawing.Imaging.ImageFormat.Jpeg);
        formats.Add("jpeg", System.Drawing.Imaging.ImageFormat.Jpeg);
        formats.Add("gif", System.Drawing.Imaging.ImageFormat.Gif);
        formats.Add("png", System.Drawing.Imaging.ImageFormat.Png);
        formats.Add("tiff", System.Drawing.Imaging.ImageFormat.Tiff);
        formats.Add("wmf", System.Drawing.Imaging.ImageFormat.Wmf);


        String ext = "";
        if (file.LastIndexOf('.') > -1)
        {
            ext = file.ToLower().Substring(file.LastIndexOf('.') + 1, file.Length - file.LastIndexOf('.') - 1);
        }
        else
        {
            Console.WriteLine("Invalid file name - no extension");
            Environment.Exit(7);
        }

        try
        {
            format = formats[ext];
        }
        catch (Exception e)
        {
            Console.WriteLine("Probably wrong file format:" + ext);
            Console.WriteLine(e.ToString());
            Environment.Exit(8);
        }

        if (arguments.Length <= 2){
            return;
        }

        if (arguments[2].ToLower().Equals("/d") || arguments[2].ToLower().Equals("/display")){
            if (arguments.Length == 2) {
                Console.WriteLine("Must specify a display if passing /display");
                Environment.Exit(9);
            }
            deviceName = arguments[3];
        }
        else if (arguments.Length > 2)
        {
            windowTitle = arguments[2];
            fullscreen = false;
        }

    }

    static void printHelp()
    {
        //clears the extension from the script name
        String scriptName = Environment.GetCommandLineArgs()[0];
        scriptName = scriptName.Substring(0, scriptName.Length);
        Console.WriteLine(scriptName + " captures the screen or the active window and saves it to a file.");
        Console.WriteLine("");
        Console.WriteLine("Usage:");
        Console.WriteLine(" " + scriptName + " filename  [WindowTitle]");
        Console.WriteLine("");
        Console.WriteLine("filename - the file where the screen capture will be saved");
        Console.WriteLine("     allowed file extensions are - Bmp,Emf,Exif,Gif,Icon,Jpeg,Png,Tiff,Wmf.");
        Console.WriteLine("WindowTitle - instead of capture whole screen you can point to a window ");
        Console.WriteLine("     with a title which will put on focus and captuted.");
        Console.WriteLine("     For WindowTitle you can pass only the first few characters.");
        Console.WriteLine("     If don't want to change the current active window pass only \"\"");
        Console.WriteLine("");
        Console.WriteLine(" " + scriptName + " (/l | /list)");
        Console.WriteLine("");
        Console.WriteLine("List the available displays");
        Console.WriteLine("");
        Console.WriteLine(" " + scriptName + " filename  (/d | /display) displayName");
        Console.WriteLine("");
        Console.WriteLine("filename - as above");
        Console.WriteLine("displayName - a display name optained from running the script with /list");
    }

    public static void Main()
    {
        parseArguments();
        ScreenCapture sc = new ScreenCapture();
        if (!fullscreen && !windowTitle.Equals(""))
        {
            try
            {

                Interaction.AppActivate(windowTitle);
                Console.WriteLine("setting " + windowTitle + " on focus");
            }
            catch (Exception e)
            {
                Console.WriteLine("Probably there's no window like " + windowTitle);
                Console.WriteLine(e.ToString());
                Environment.Exit(9);
            }


        }
        try
        {
            if (fullscreen)
            {
                Console.WriteLine("Taking a capture of the whole screen to " + file);
                sc.CaptureScreenToFile(file, format);
            }
            else
            {
                Console.WriteLine("Taking a capture of the active window to " + file);
                sc.CaptureActiveWindowToFile(file, format);
            }
        }
        catch (Exception e)
        {
            Console.WriteLine("Check if file path is valid " + file);
            Console.WriteLine(e.ToString());
        }
    }

    /// Helper class containing Gdi32 API functions

    private class GDI32
    {

        public const int SRCCOPY = 0x00CC0020; // BitBlt dwRop parameter
        [DllImport("gdi32.dll")]
        public static extern bool BitBlt(IntPtr hObject, int nXDest, int nYDest,
          int nWidth, int nHeight, IntPtr hObjectSource,
          int nXSrc, int nYSrc, int dwRop);
        [DllImport("gdi32.dll")]
        public static extern IntPtr CreateCompatibleBitmap(IntPtr hDC, int nWidth,
          int nHeight);
        [DllImport("gdi32.dll")]
        public static extern IntPtr CreateCompatibleDC(IntPtr hDC);
        [DllImport("gdi32.dll")]
        public static extern bool DeleteDC(IntPtr hDC);
        [DllImport("gdi32.dll")]
        public static extern bool DeleteObject(IntPtr hObject);
        [DllImport("gdi32.dll")]
        public static extern IntPtr SelectObject(IntPtr hDC, IntPtr hObject);
    }


    /// Helper class containing User32 API functions

    public class User32
    {
        [StructLayout(LayoutKind.Sequential)]
        public struct RECT
        {
            public int left;
            public int top;
            public int right;
            public int bottom;
        }

        [DllImport("user32.dll")]
        public static extern IntPtr GetDC(IntPtr hWnd);
        [DllImport("user32.dll")]
        public static extern IntPtr GetDesktopWindow();
        [DllImport("user32.dll")]
        public static extern IntPtr GetWindowDC(IntPtr hWnd);
        [DllImport("user32.dll")]
        public static extern IntPtr ReleaseDC(IntPtr hWnd, IntPtr hDC);
        [DllImport("user32.dll")]
        public static extern IntPtr GetWindowRect(IntPtr hWnd, ref RECT rect);
        [DllImport("user32.dll")]
        public static extern IntPtr GetForegroundWindow();

       [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
       public struct MONITORINFOEX
       {
           public uint size;
           public RECT Monitor;
           public RECT WorkArea;
           public uint Flags;
           [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)]
           public string DeviceName;
       }

       [DllImport("user32.dll", CharSet = CharSet.Unicode)]
       public static extern bool GetMonitorInfo(IntPtr hMonitor, ref MONITORINFOEX lpmi);

       public delegate bool MonitorEnumDelegate(IntPtr hMonitor, IntPtr hdcMonitor, ref RECT lprcMonitor, IntPtr dwData);

       [DllImport("user32.dll")]
       public static extern bool EnumDisplayMonitors(IntPtr hdc, IntPtr lprcClip, MonitorEnumDelegate lpfnEnum, IntPtr dwData);
    }

    public class Shcore
    {
       [DllImport("Shcore.dll")]
       public static extern IntPtr GetDpiForMonitor(IntPtr hMonitor, int dpiType, out uint dpiX, out uint dpiY);
    }

    private class MonitorInfoWithHandle
    {
        public IntPtr MonitorHandle { get; private set; }
        public User32.MONITORINFOEX MonitorInfo { get; private set; }
        public float DpiScale { get; private set; }
        public MonitorInfoWithHandle(IntPtr monitorHandle, User32.MONITORINFOEX monitorInfo, float dpiScale)
        {
            MonitorHandle = monitorHandle;
            MonitorInfo = monitorInfo;
            DpiScale = dpiScale;
        }
    }
    private static bool MonitorEnum(IntPtr hMonitor, IntPtr hdcMonitor, ref User32.RECT lprcMonitor, IntPtr dwData)
    {
        var mi = new User32.MONITORINFOEX();
        mi.size = (uint)Marshal.SizeOf(mi);
        User32.GetMonitorInfo(hMonitor, ref mi);
        uint dpiX, dpiY;
        Shcore.GetDpiForMonitor(hMonitor, 0, out dpiX, out dpiY);
        float dpiScale = ((float) dpiX) / 96;

        _monitorInfos.Add(new MonitorInfoWithHandle(hMonitor, mi, dpiScale));
        return true;
    }
    private static bool CaptureMonitorEnum(IntPtr hMonitor, IntPtr hdcMonitor, ref User32.RECT lprcMonitor, IntPtr dwData)
    {
        var mi = new User32.MONITORINFOEX();
        mi.size = (uint)Marshal.SizeOf(mi);
        User32.GetMonitorInfo(hMonitor, ref mi);
        if (mi.DeviceName.ToLower().Equals(deviceName.ToLower())) {
            Console.WriteLine("hMonitor is {0}, hdcMonitor is {1}", hMonitor, hdcMonitor);
            capturedImage = CaptureWindowFromDC(hMonitor, hdcMonitor, lprcMonitor);
        }
        return true;
    }
    public static void CaptureSpecificWindow()
    {
        IntPtr hdc = User32.GetDC(IntPtr.Zero);
        User32.EnumDisplayMonitors(hdc, IntPtr.Zero, CaptureMonitorEnum, IntPtr.Zero);
        User32.ReleaseDC(IntPtr.Zero, hdc);
    }
    private static List<MonitorInfoWithHandle> GetMonitors()
    {
        _monitorInfos = new List<MonitorInfoWithHandle>();

        User32.EnumDisplayMonitors(IntPtr.Zero, IntPtr.Zero, MonitorEnum, IntPtr.Zero);

        return _monitorInfos;
    }

    public static void PrintMonitorInfo()
    {
        var mis = GetMonitors();
        foreach (var mi in mis)
        {
            Console.WriteLine("{0};{1};{2};{3};{4};{5}",
                mi.MonitorInfo.DeviceName,
                mi.MonitorInfo.Monitor.top,
                mi.MonitorInfo.Monitor.right,
                mi.MonitorInfo.Monitor.bottom,
                mi.MonitorInfo.Monitor.left,
                mi.DpiScale);
        }
    }
}
