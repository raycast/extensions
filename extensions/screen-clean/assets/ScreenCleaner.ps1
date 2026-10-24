param(
    [int]$Seconds = 60,
    [int]$LockKeyboard = 1,
    [int]$ShowHint = 1,
    [string]$ReadyFile = "",
    [string]$LogPath = ""
)

$ErrorActionPreference = "Stop"

try {
    if ($LogPath -ne "" -and (Test-Path -LiteralPath $LogPath)) {
        Remove-Item -LiteralPath $LogPath -Force
    }

    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing

    $references = @(
        [System.Windows.Forms.Form].Assembly.Location,
        [System.Drawing.Point].Assembly.Location
    )

    $source = @'
using System;
using System.Drawing;
using System.IO;
using System.Runtime.InteropServices;
using System.Windows.Forms;

public static class ScreenCleanerApp
{
    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_KEYUP = 0x0101;
    private const int WM_SYSKEYDOWN = 0x0104;
    private const int WM_SYSKEYUP = 0x0105;
    private const int VK_ESCAPE = 0x1B;
    private const uint ES_CONTINUOUS = 0x80000000;
    private const uint ES_SYSTEM_REQUIRED = 0x00000001;
    private const uint ES_DISPLAY_REQUIRED = 0x00000002;
    private const int ESCAPE_PRESS_TARGET = 5;
    private const int ESCAPE_SEQUENCE_TIMEOUT_MS = 2000;

    [StructLayout(LayoutKind.Sequential)]
    private struct KBDLLHOOKSTRUCT
    {
        public uint vkCode;
        public uint scanCode;
        public uint flags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll")]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);

    [DllImport("kernel32.dll")]
    private static extern uint SetThreadExecutionState(uint esFlags);

    private static LowLevelKeyboardProc _hookProc;
    private static IntPtr _hook = IntPtr.Zero;
    private static Form[] _forms;
    private static Label[] _labels;
    private static Timer _timer;
    private static int _seconds;
    private static bool _lockKeyboard;
    private static bool _showHint;
    private static bool _hookActive;
    private static string _baseHint = "";
    private static DateTime _startedAt;
    private static DateTime _lastEscapeAt;
    private static DateTime _hintUntil;
    private static bool _hintTimerActive;
    private static int _escapeCount;
    private static bool _escapeDown;
    private static bool _exiting;

    public static void Run(int seconds, bool lockKeyboard, bool showHint, string readyFile)
    {
        _seconds = seconds > 0 ? seconds : 1800;
        _lockKeyboard = lockKeyboard;
        _showHint = showHint;
        _startedAt = DateTime.UtcNow;

        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);

        Screen[] screens = Screen.AllScreens;
        _forms = new Form[screens.Length];
        _labels = new Label[screens.Length];

        for (int i = 0; i < screens.Length; i++)
        {
            Screen screen = screens[i];
            Form form = new Form();
            form.FormBorderStyle = FormBorderStyle.None;
            form.StartPosition = FormStartPosition.Manual;
            form.Bounds = screen.Bounds;
            form.BackColor = Color.Black;
            form.TopMost = true;
            form.ShowInTaskbar = false;
            form.KeyPreview = true;
            form.AutoScaleMode = AutoScaleMode.None;

            Label label = new Label();
            label.Dock = DockStyle.Fill;
            label.TextAlign = ContentAlignment.MiddleCenter;
            label.Font = new Font("Segoe UI", 18f, FontStyle.Regular, GraphicsUnit.Point);
            label.ForeColor = Color.FromArgb(120, 120, 120);
            label.BackColor = Color.Black;
            label.Text = "";

            form.Controls.Add(label);
            form.KeyDown += OnFormKeyDown;
            form.KeyUp += OnFormKeyUp;
            form.MouseClick += OnFormMouseClick;
            label.MouseClick += OnFormMouseClick;
            form.FormClosing += OnFormClosing;

            _forms[i] = form;
            _labels[i] = label;
        }

        SetThreadExecutionState(ES_CONTINUOUS | ES_SYSTEM_REQUIRED | ES_DISPLAY_REQUIRED);

        if (_lockKeyboard)
        {
            _hookActive = InstallHook();
        }

        _baseHint = BuildBaseHint();
        if (_showHint && _baseHint.Length > 0)
        {
            ShowHint(_baseHint, Color.FromArgb(120, 120, 120), 4.0);
        }

        _timer = new Timer();
        _timer.Interval = 200;
        _timer.Tick += OnTick;
        _timer.Start();

        for (int i = 0; i < _forms.Length; i++)
        {
            _forms[i].Show();
        }
        if (_forms.Length > 0)
        {
            _forms[0].Activate();
        }

        if (!String.IsNullOrEmpty(readyFile))
        {
            try
            {
                File.WriteAllText(readyFile, "ready");
            }
            catch
            {
            }
        }

        Application.Run();
    }

    private static string BuildBaseHint()
    {
        if (!_showHint)
        {
            return "";
        }
        if (_lockKeyboard && !_hookActive)
        {
            return "Keyboard lock unavailable - press Esc 5 times to exit";
        }
        if (_seconds >= 1800)
        {
            return "Cleaning mode (max 30 min) - press Esc 5 times to exit";
        }
        return "Cleaning mode - press Esc 5 times to exit";
    }

    private static bool InstallHook()
    {
        _hookProc = HookCallback;
        _hook = SetWindowsHookEx(WH_KEYBOARD_LL, _hookProc, GetModuleHandle(null), 0);
        return _hook != IntPtr.Zero;
    }

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
    {
        if (nCode >= 0)
        {
            int message = wParam.ToInt32();
            KBDLLHOOKSTRUCT info = (KBDLLHOOKSTRUCT)Marshal.PtrToStructure(lParam, typeof(KBDLLHOOKSTRUCT));

            if (message == WM_KEYDOWN || message == WM_SYSKEYDOWN)
            {
                if (info.vkCode == VK_ESCAPE && !_escapeDown)
                {
                    _escapeDown = true;
                    HandleEscapePress();
                }
                return (IntPtr)1;
            }
            if (message == WM_KEYUP || message == WM_SYSKEYUP)
            {
                if (info.vkCode == VK_ESCAPE)
                {
                    _escapeDown = false;
                }
                return (IntPtr)1;
            }
        }
        return CallNextHookEx(_hook, nCode, wParam, lParam);
    }

    private static void OnFormKeyDown(object sender, KeyEventArgs e)
    {
        e.Handled = true;
        e.SuppressKeyPress = true;

        if (e.KeyCode == Keys.Escape && !_escapeDown)
        {
            _escapeDown = true;
            HandleEscapePress();
        }
    }

    private static void OnFormKeyUp(object sender, KeyEventArgs e)
    {
        e.Handled = true;
        e.SuppressKeyPress = true;

        if (e.KeyCode == Keys.Escape)
        {
            _escapeDown = false;
        }
    }

    private static void OnFormMouseClick(object sender, MouseEventArgs e)
    {
        if (_escapeCount > 0)
        {
            return;
        }
        if (_showHint && _baseHint.Length > 0)
        {
            ShowHint(_baseHint, Color.FromArgb(120, 120, 120), 3.0);
        }
    }

    private static void OnFormClosing(object sender, FormClosingEventArgs e)
    {
        if (!_exiting)
        {
            e.Cancel = true;
        }
    }

    private static void HandleEscapePress()
    {
        if (_exiting)
        {
            return;
        }

        DateTime now = DateTime.UtcNow;
        if (_escapeCount > 0 && (now - _lastEscapeAt).TotalMilliseconds > ESCAPE_SEQUENCE_TIMEOUT_MS)
        {
            _escapeCount = 0;
        }

        _escapeCount++;
        _lastEscapeAt = now;
        ShowHint("Press Esc 5 times to exit - " + _escapeCount + "/5", Color.White, 0);

        if (_escapeCount >= ESCAPE_PRESS_TARGET)
        {
            ExitCleaner();
        }
    }

    private static void OnTick(object sender, EventArgs e)
    {
        if (_exiting)
        {
            return;
        }

        if ((DateTime.UtcNow - _startedAt).TotalSeconds >= _seconds)
        {
            ExitCleaner();
            return;
        }

        if (_escapeCount > 0 && (DateTime.UtcNow - _lastEscapeAt).TotalMilliseconds > ESCAPE_SEQUENCE_TIMEOUT_MS)
        {
            _escapeCount = 0;
            if (_showHint && _baseHint.Length > 0)
            {
                ShowHint(_baseHint, Color.FromArgb(120, 120, 120), 1.5);
            }
            else
            {
                ShowHint("", Color.White, 0);
            }
        }

        if (_hintTimerActive && DateTime.UtcNow >= _hintUntil)
        {
            _hintTimerActive = false;
            if (_escapeCount == 0)
            {
                ShowHint("", Color.White, 0);
            }
        }
    }

    private static void ShowHint(string text, Color color, double seconds)
    {
        for (int i = 0; i < _labels.Length; i++)
        {
            _labels[i].Text = text;
            _labels[i].ForeColor = color;
        }

        if (seconds > 0)
        {
            _hintUntil = DateTime.UtcNow.AddSeconds(seconds);
            _hintTimerActive = true;
        }
        else
        {
            _hintTimerActive = false;
        }
    }

    private static void ExitCleaner()
    {
        if (_exiting)
        {
            return;
        }
        _exiting = true;

        if (_timer != null)
        {
            _timer.Stop();
            _timer.Dispose();
            _timer = null;
        }

        if (_hook != IntPtr.Zero)
        {
            UnhookWindowsHookEx(_hook);
            _hook = IntPtr.Zero;
        }

        SetThreadExecutionState(ES_CONTINUOUS);
        Application.Exit();
    }
}
'@

    Add-Type -TypeDefinition $source -ReferencedAssemblies $references -ErrorAction Stop
    [ScreenCleanerApp]::Run($Seconds, ($LockKeyboard -ne 0), ($ShowHint -ne 0), $ReadyFile)
}
catch {
    if ($LogPath -ne "") {
        try {
            $message = (Get-Date).ToString("s") + " " + $_.Exception.ToString()
            Set-Content -LiteralPath $LogPath -Value $message -Encoding UTF8
        }
        catch {
        }
    }
    exit 1
}
