<#
  Keyboard hint overlay con WinForms + UIA en C# puro.
  Toda la lógica se ejecuta en C# para eliminar el lag del COM Interop en PowerShell.
  Usa UIA CacheRequest para un escaneo casi instantáneo.
  Mantiene el overlay vivo en un bucle: escanea -> tecleas -> clic -> re-escanea
  hasta que pulses ESC.
#>
#Requires -Version 5.1
$ErrorActionPreference = 'Stop'

try {

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName WindowsBase
Add-Type -AssemblyName PresentationCore
Add-Type -AssemblyName PresentationFramework
 
$csharp = @'

using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Text;
using System.Windows.Forms;
using System.Windows.Automation;
using System.Runtime.InteropServices;
using System.Threading;

public class HintData { 
    public string Label; 
    public AutomationElement Element; 
    public int CX, CY; 
}

public static class Win32Nav {
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] public static extern void mouse_event(uint f, int x, int y, uint d, UIntPtr e);
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
    public const uint LD = 2, LU = 4;
}

public class HintOverlayForm : Form {
    private readonly List<HintData> _hints;
    private readonly Bitmap _bg;
    private readonly Font _font;
    private string _typed = "";
    private readonly HashSet<string> _hidden = new HashSet<string>();
    private System.Windows.Forms.Timer _matchTimer;
    
    public HintData SelectedHint { get; private set; }

    public HintOverlayForm(List<HintData> hints, Bitmap bg) {
        _hints = hints; _bg = bg;
        _font = new Font("Consolas", 10f, FontStyle.Bold);
        FormBorderStyle = FormBorderStyle.None;
        WindowState = FormWindowState.Maximized;
        TopMost = true; 
        DoubleBuffered = true; 
        KeyPreview = true;
        SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint, true);
        Cursor = Cursors.Default;
        _matchTimer = new System.Windows.Forms.Timer();
        _matchTimer.Interval = 1000;
        _matchTimer.Tick += (s, e) => {
            _matchTimer.Stop();
            foreach (var h in _hints) {
                if (h.Label == _typed) { SelectedHint = h; Close(); return; }
            }
        };
    }

    protected override void OnKeyDown(KeyEventArgs e) {
        _matchTimer.Stop();
        if (e.KeyCode == Keys.Escape) { SelectedHint = null; Close(); return; }
        if (e.KeyCode == Keys.Back) {
            if (_typed.Length > 0) _typed = _typed.Substring(0, _typed.Length - 1);
            _hidden.Clear(); Invalidate(); return;
        }
        string k = e.KeyCode.ToString();
        if (k.Length != 1 || !char.IsLetter(k[0])) return;
        _typed += k.ToUpper();
        foreach (var h in _hints) if (!h.Label.StartsWith(_typed)) _hidden.Add(h.Label);
        foreach (var h in _hints) if (h.Label.StartsWith(_typed)) _hidden.Remove(h.Label);
        Invalidate();
        foreach (var h in _hints) {
            if (h.Label == _typed) {
                bool hasLonger = false;
                foreach (var lh in _hints) if (lh.Label.StartsWith(_typed) && lh.Label.Length > _typed.Length) { hasLonger = true; break; }
                if (hasLonger) { _matchTimer.Start(); return; }
                SelectedHint = h; Close(); return;
            }
        }
    }

    protected override void OnPaint(PaintEventArgs e) {
        e.Graphics.DrawImage(_bg, 0, 0, Width, Height);
        using (var b = new SolidBrush(Color.FromArgb(60, 0, 0, 0)))
            e.Graphics.FillRectangle(b, ClientRectangle);
            
        e.Graphics.TextRenderingHint = TextRenderingHint.ClearTypeGridFit;
        foreach (var h in _hints) {
            if (_hidden.Contains(h.Label)) continue;
            var sz = e.Graphics.MeasureString(h.Label, _font);
            float x = h.CX - sz.Width / 2 - 3, y = h.CY - sz.Height / 2 - 1;
            using (var b = new SolidBrush(Color.FromArgb(230, 255, 213, 0)))
                e.Graphics.FillRectangle(b, x, y, sz.Width + 6, sz.Height + 2);
            using (var p = new Pen(Color.FromArgb(200, 160, 120, 0), 1))
                e.Graphics.DrawRectangle(p, x, y, sz.Width + 5, sz.Height + 1);
            e.Graphics.DrawString(h.Label, _font, Brushes.Black, x + 3, y + 1);
        }
        
        string st = _typed.Length > 0 ? "Typed: " + _typed : "Type the label  ·  ESC to exit";
        using (var f = new Font("Segoe UI", 13f)) {
            var sz = e.Graphics.MeasureString(st, f);
            float tx = (Width - sz.Width) / 2f;
            using (var b = new SolidBrush(Color.FromArgb(210, 20, 20, 20)))
                e.Graphics.FillRectangle(b, tx - 9, 0, sz.Width + 18, sz.Height + 14);
            e.Graphics.DrawString(st, f, Brushes.White, tx, 7);
        }
    }
}

public static class HintOverlayRunner {
    public static void Run() {
        Win32Nav.SetProcessDPIAware();
        IntPtr targetHwnd = Win32Nav.GetForegroundWindow();
        Application.EnableVisualStyles();
        
        while (true) {
            var desktop = AutomationElement.RootElement;
            var condHwnd = new PropertyCondition(AutomationElement.NativeWindowHandleProperty, targetHwnd.ToInt32());
            var targetWin = desktop.FindFirst(TreeScope.Children, condHwnd);
            
            if (targetWin == null) break;

            var condTypes = new OrCondition(
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Button),
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Hyperlink),
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.MenuItem),
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.ListItem),
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.TabItem),
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.CheckBox),
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.RadioButton),
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.Edit),
                new PropertyCondition(AutomationElement.ControlTypeProperty, ControlType.ComboBox)
            );

            // OPTIMIZATION: Use CacheRequest to get all properties in ONE COM call
            AutomationElementCollection raw = null;
            CacheRequest cache = new CacheRequest();
            cache.Add(AutomationElement.BoundingRectangleProperty);
            cache.Add(AutomationElement.IsEnabledProperty);
            cache.Add(AutomationElement.IsOffscreenProperty);
            cache.TreeFilter = Automation.ControlViewCondition;
            
            using (cache.Activate()) {
                raw = targetWin.FindAll(TreeScope.Descendants, condTypes);
            }

            var hints = new List<HintData>();
            string alpha = "ASDFJKLGHQWERTYUIOPZXCVBNM";
            int idx = 0;

            foreach (AutomationElement el in raw) {
                try {
                    // Use Cached properties -> Instant
                    var r = el.Cached.BoundingRectangle;
                    if (r.Width <= 0 || r.Height <= 0 || !el.Cached.IsEnabled || el.Cached.IsOffscreen) continue;

                    string lbl = "";
                    int n = idx;
                    do {
                        lbl = alpha[n % alpha.Length] + lbl;
                        n = (n / alpha.Length) - 1;
                    } while (n >= 0);

                    hints.Add(new HintData {
                        Label = lbl,
                        Element = el,
                        CX = (int)(r.X + r.Width / 2),
                        CY = (int)(r.Y + r.Height / 2)
                    });
                    idx++;
                } catch { } // ignore
            }

            if (hints.Count == 0) { Environment.Exit(2); return; } // Nothing to click

            var scr = Screen.PrimaryScreen.Bounds;
            Bitmap bg = new Bitmap(scr.Width, scr.Height);
            using (var gfx = Graphics.FromImage(bg)) {
                gfx.CopyFromScreen(0, 0, 0, 0, scr.Size);
            }

            HintData selected;
            using (var form = new HintOverlayForm(hints, bg)) {
                Application.Run(form);
                selected = form.SelectedHint;
            }
            bg.Dispose();

            if (selected == null) {
                break; // User pressed Esc
            }

            // Bring target back to front before clicking
            Win32Nav.SetForegroundWindow(targetHwnd);
            Thread.Sleep(50); // slight delay to focus

            bool clicked = false;
            try {
                // Must get current pattern for Invoke, cached won't work
                var pat = selected.Element.GetCurrentPattern(InvokePattern.Pattern) as InvokePattern;
                if (pat != null) {
                    pat.Invoke();
                    clicked = true;
                }
            } catch { }

            if (!clicked) {
                Win32Nav.SetCursorPos(selected.CX, selected.CY);
                Win32Nav.mouse_event(Win32Nav.LD, selected.CX, selected.CY, 0, UIntPtr.Zero);
                Thread.Sleep(30); // prevent ghost clicks
                Win32Nav.mouse_event(Win32Nav.LU, selected.CX, selected.CY, 0, UIntPtr.Zero);
            }

            // Wait for UI to react to the click before scanning again
            Thread.Sleep(350); 
        }
    }
}
'@

# No cache for development to ensure updates are applied
try {
    Add-Type -TypeDefinition $csharp -ReferencedAssemblies @(
        'System.Drawing', 'System.Windows.Forms',
        'UIAutomationClient', 'UIAutomationTypes',
        'WindowsBase, Version=4.0.0.0, Culture=neutral, PublicKeyToken=31bf3856ad364e35', 'PresentationCore', 'PresentationFramework'
    ) -ErrorAction Stop
} catch {
    [Console]::Error.WriteLine("COMPILE_ERROR: $($_.Exception.Message)")
    exit 3
}

[HintOverlayRunner]::Run()

} catch {
    [Console]::Error.WriteLine($_.Exception.Message); exit 3
}
