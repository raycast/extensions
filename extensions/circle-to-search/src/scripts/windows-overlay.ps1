param (
    [Parameter(Mandatory=$true)]
    [string]$OutputPath
)

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName WindowsBase

# Win32 APIs for Window detection
$typeDefinition = @"
using System;
using System.Runtime.InteropServices;
using System.Drawing;

public class Win32WindowHelper {
    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll")]
    public static extern IntPtr WindowFromPoint(Point pt);

    [DllImport("user32.dll")]
    public static extern IntPtr GetAncestor(IntPtr hwnd, uint gaFlags);

    [DllImport("dwmapi.dll")]
    public static extern int DwmGetWindowAttribute(IntPtr hwnd, int dwAttribute, out RECT pvAttribute, int cbAttribute);

    public const uint GA_ROOT = 2;
    public const int DWMWA_EXTENDED_FRAME_BOUNDS = 9;

    public static Rectangle GetWindowBoundsAtPoint(Point pt, IntPtr overlayHwnd) {
        IntPtr hwnd = WindowFromPoint(pt);
        if (hwnd == IntPtr.Zero || hwnd == overlayHwnd) return Rectangle.Empty;
        IntPtr rootHwnd = GetAncestor(hwnd, GA_ROOT);
        if (rootHwnd != IntPtr.Zero && rootHwnd != overlayHwnd) hwnd = rootHwnd;

        RECT rect;
        int res = DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, out rect, Marshal.SizeOf(typeof(RECT)));
        if (res == 0) {
            return new Rectangle(rect.Left, rect.Top, rect.Right - rect.Left, rect.Bottom - rect.Top);
        }
        return Rectangle.Empty;
    }
}
"@
Add-Type -TypeDefinition $typeDefinition

[System.Windows.Forms.Application]::EnableVisualStyles()

# 1. Capture Virtual Screen
$virtualScreen = [System.Windows.Forms.SystemInformation]::VirtualScreen
$left = $virtualScreen.Left
$top = $virtualScreen.Top
$width = $virtualScreen.Width
$height = $virtualScreen.Height

$captureBmp = New-Object System.Drawing.Bitmap $width, $height
$graphics = [System.Drawing.Graphics]::FromImage($captureBmp)
$graphics.CopyFromScreen($left, $top, 0, 0, (New-Object System.Drawing.Size $width, $height))
$graphics.Dispose()

# Create dark dimmed overlay
$displayBmp = New-Object System.Drawing.Bitmap $width, $height
$displayG = [System.Drawing.Graphics]::FromImage($displayBmp)
$displayG.DrawImage($captureBmp, 0, 0, $width, $height)
$darkBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(140, 0, 0, 0))
$displayG.FillRectangle($darkBrush, 0, 0, $width, $height)
$darkBrush.Dispose()
$displayG.Dispose()

# Create Fullscreen Overlay Form
$form = New-Object System.Windows.Forms.Form
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$form.Location = New-Object System.Drawing.Point $left, $top
$form.Size = New-Object System.Drawing.Size $width, $height
$form.TopMost = $true
$form.ShowInTaskbar = $false

# Custom Precision Reticle Cursor
$cursorBmp = New-Object System.Drawing.Bitmap 32, 32
$cg = [System.Drawing.Graphics]::FromImage($cursorBmp)
$cg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$cOuterDark = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(180, 0, 0, 0)), 2.5
$cg.DrawEllipse($cOuterDark, 7, 7, 18, 18)
$cOuterDark.Dispose()

$cOuterLight = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 255, 255, 255)), 1.5
$cg.DrawEllipse($cOuterLight, 7, 7, 18, 18)
$cOuterLight.Dispose()

$cCenterDot = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
$cg.FillEllipse($cCenterDot, 14, 14, 4, 4)
$cCenterDot.Dispose()
$cg.Dispose()

$hIcon = $cursorBmp.GetHicon()
$customCursor = New-Object System.Windows.Forms.Cursor $hIcon
$form.Cursor = $customCursor

# Enable Double Buffering
$formType = $form.GetType()
$pi = $formType.GetProperty("DoubleBuffered", [System.Reflection.BindingFlags]"Instance,NonPublic")
if ($pi) { $pi.SetValue($form, $true, $null) }

# State Variables
# Mode: 0 = Freeform, 1 = Rectangle, 2 = Window, 3 = Element
$script:mode = 0
$modes = @("Freeform", "Rectangle", "Window", "Element")
$modeIcons = @("⭕", "⬛", "🪟", "🔲")

$points = New-Object System.Collections.Generic.List[System.Drawing.Point]
$script:isDrawing = $false
$script:rectStart = [System.Drawing.Point]::Empty
$script:rectCurrent = [System.Drawing.Point]::Empty
$script:hoverRect = [System.Drawing.Rectangle]::Empty
$script:saved = $false

# Pens & Brushes
$darkPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(200, 30, 30, 30)), 2.0
$darkPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

$lightPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(240, 255, 255, 255)), 1.0
$lightPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

$bluePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255, 66, 133, 244)), 2.5
$bluePen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round

$hudFont = New-Object System.Drawing.Font ("Segoe UI", 9.5, [System.Drawing.FontStyle]::Bold)
$hudSubFont = New-Object System.Drawing.Font ("Segoe UI", 8.0, [System.Drawing.FontStyle]::Regular)
$hudBgBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(215, 25, 25, 25))
$hudActiveBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 66, 133, 244))
$whiteBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$dimTextBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(180, 200, 200, 200))
$hudBorderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(60, 255, 255, 255)), 1.0

function SaveCroppedArea([System.Drawing.Rectangle]$cropRect, [System.Drawing.Drawing2D.GraphicsPath]$shapePath = $null) {
    if ($cropRect.Width -lt 10 -or $cropRect.Height -lt 10) { return }

    # Constrain to screen bounds
    $cx = [Math]::Max(0, [Math]::Min($width - 10, $cropRect.X - $left))
    $cy = [Math]::Max(0, [Math]::Min($height - 10, $cropRect.Y - $top))
    $cw = [Math]::Min($width - $cx, $cropRect.Width)
    $ch = [Math]::Min($height - $cy, $cropRect.Height)

    if ($cw -lt 10 -or $ch -lt 10) { return }

    $resultBmp = New-Object System.Drawing.Bitmap $cw, $ch, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $resG = [System.Drawing.Graphics]::FromImage($resultBmp)
    $resG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $resG.Clear([System.Drawing.Color]::FromArgb(0, 0, 0, 0))

    if ($shapePath -ne $null) {
        $matrix = New-Object System.Drawing.Drawing2D.Matrix
        $matrix.Translate(-$cx, -$cy)
        $shapePath.Transform($matrix)
        $matrix.Dispose()
        $resG.SetClip($shapePath)
    }

    $destRect = New-Object System.Drawing.Rectangle 0, 0, $cw, $ch
    $srcRect = New-Object System.Drawing.Rectangle $cx, $cy, $cw, $ch
    $resG.DrawImage($captureBmp, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

    $resG.Dispose()

    $outDir = [System.IO.Path]::GetDirectoryName($OutputPath)
    if (-not [string]::IsNullOrEmpty($outDir) -and -not [System.IO.Directory]::Exists($outDir)) {
        [System.IO.Directory]::CreateDirectory($outDir) | Out-Null
    }

    $resultBmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $resultBmp.Dispose()
    $script:saved = $true
    $form.Close()
}

$form.add_Paint({
    param($sender, $e)
    # 1. Base dimmed screen
    $e.Graphics.DrawImage($displayBmp, 0, 0)
    $e.Graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

    # 2. Mode-specific highlight
    if ($script:mode -eq 0) {
        # --- FREEFORM MODE ---
        if ($points.Count -gt 2) {
            $path = New-Object System.Drawing.Drawing2D.GraphicsPath
            $path.AddLines($points.ToArray())
            $path.CloseFigure()

            $state = $e.Graphics.Save()
            $e.Graphics.SetClip($path)
            $e.Graphics.DrawImage($captureBmp, 0, 0)
            $e.Graphics.Restore($state)

            $e.Graphics.DrawPath($darkPen, $path)
            $e.Graphics.DrawPath($lightPen, $path)
            $path.Dispose()
        } elseif ($points.Count -eq 2) {
            $e.Graphics.DrawLine($darkPen, $points[0], $points[1])
            $e.Graphics.DrawLine($lightPen, $points[0], $points[1])
        }
    } elseif ($script:mode -eq 1) {
        # --- RECTANGLE MODE ---
        if ($script:isDrawing) {
            $rx = [Math]::Min($script:rectStart.X, $script:rectCurrent.X)
            $ry = [Math]::Min($script:rectStart.Y, $script:rectCurrent.Y)
            $rw = [Math]::Abs($script:rectCurrent.X - $script:rectStart.X)
            $rh = [Math]::Abs($script:rectCurrent.Y - $script:rectStart.Y)

            if ($rw -gt 2 -and $rh -gt 2) {
                $selRect = New-Object System.Drawing.Rectangle $rx, $ry, $rw, $rh
                $state = $e.Graphics.Save()
                $e.Graphics.SetClip($selRect)
                $e.Graphics.DrawImage($captureBmp, 0, 0)
                $e.Graphics.Restore($state)

                $e.Graphics.DrawRectangle($darkPen, $selRect)
                $e.Graphics.DrawRectangle($bluePen, $selRect)
            }
        }
    } elseif ($script:mode -eq 2 -or $script:mode -eq 3) {
        # --- WINDOW / ELEMENT AUTO-DETECT MODES ---
        if (-not $script:hoverRect.IsEmpty -and $script:hoverRect.Width -gt 10 -and $script:hoverRect.Height -gt 10) {
            $hrX = $script:hoverRect.X - $left
            $hrY = $script:hoverRect.Y - $top
            $hrW = $script:hoverRect.Width
            $hrH = $script:hoverRect.Height

            $drawHoverRect = New-Object System.Drawing.Rectangle $hrX, $hrY, $hrW, $hrH
            $state = $e.Graphics.Save()
            $e.Graphics.SetClip($drawHoverRect)
            $e.Graphics.DrawImage($captureBmp, 0, 0)
            $e.Graphics.Restore($state)

            $e.Graphics.DrawRectangle($darkPen, $drawHoverRect)
            $e.Graphics.DrawRectangle($bluePen, $drawHoverRect)
        }
    }

    # 3. Render Modern Floating HUD Pill at Top Center
    $hudW = 440
    $hudH = 46
    $hudX = [int](($width - $hudW) / 2)
    $hudY = 24

    $hudRect = New-Object System.Drawing.Rectangle $hudX, $hudY, $hudW, $hudH
    $e.Graphics.FillRectangle($hudBgBrush, $hudRect)
    $e.Graphics.DrawRectangle($hudBorderPen, $hudRect)

    $tabW = [int]($hudW / 4)
    for ($i = 0; $i -lt 4; $i++) {
        $tabX = $hudX + ($i * $tabW)
        if ($i -eq $script:mode) {
            $actRect = New-Object System.Drawing.Rectangle ($tabX + 4), ($hudY + 5), ($tabW - 8), 24
            $e.Graphics.FillRectangle($hudActiveBrush, $actRect)
        }
        $label = "$($modeIcons[$i]) $($modes[$i])"
        $txtBrush = if ($i -eq $script:mode) { $whiteBrush } else { $dimTextBrush }
        $sf = New-Object System.Drawing.StringFormat
        $sf.Alignment = [System.Drawing.StringAlignment]::Center
        $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
        $tabRect = New-Object System.Drawing.RectangleF $tabX, ($hudY + 5), $tabW, 24
        $e.Graphics.DrawString($label, $hudFont, $txtBrush, $tabRect, $sf)
        $sf.Dispose()
    }

    # Subtitle instructions
    $subSf = New-Object System.Drawing.StringFormat
    $subSf.Alignment = [System.Drawing.StringAlignment]::Center
    $subRect = New-Object System.Drawing.RectangleF $hudX, ($hudY + 30), $hudW, 14
    $e.Graphics.DrawString("Press Alt or 1-4 to switch mode  *  Esc to cancel", $hudSubFont, $dimTextBrush, $subRect, $subSf)
    $subSf.Dispose()
})

$form.add_MouseDown({
    param($sender, $e)
    if ($e.Button -ne [System.Windows.Forms.MouseButtons]::Left) { return }

    if ($script:mode -eq 0) {
        # Freeform
        $script:isDrawing = $true
        $points.Clear()
        $points.Add($e.Location)
        $form.Invalidate()
    } elseif ($script:mode -eq 1) {
        # Rectangle
        $script:isDrawing = $true
        $script:rectStart = $e.Location
        $script:rectCurrent = $e.Location
        $form.Invalidate()
    } elseif ($script:mode -eq 2 -or $script:mode -eq 3) {
        # Window or Element click -> Instant capture!
        if (-not $script:hoverRect.IsEmpty) {
            SaveCroppedArea $script:hoverRect
        }
    }
})

$form.add_MouseMove({
    param($sender, $e)
    if ($script:mode -eq 0 -and $script:isDrawing) {
        # Freeform
        $points.Add($e.Location)
        $form.Invalidate()
    } elseif ($script:mode -eq 1 -and $script:isDrawing) {
        # Rectangle
        $script:rectCurrent = $e.Location
        $form.Invalidate()
    } elseif ($script:mode -eq 2) {
        # Window Auto-Detect
        $screenPt = [System.Windows.Forms.Cursor]::Position
        $wRect = [Win32WindowHelper]::GetWindowBoundsAtPoint($screenPt, $form.Handle)
        if ($wRect -ne $script:hoverRect) {
            $script:hoverRect = $wRect
            $form.Invalidate()
        }
    } elseif ($script:mode -eq 3) {
        # Element Auto-Detect
        try {
            $screenPt = [System.Windows.Forms.Cursor]::Position
            $uPoint = New-Object System.Windows.Point $screenPt.X, $screenPt.Y
            $elem = [System.Windows.Automation.AutomationElement]::FromPoint($uPoint)
            if ($elem -ne $null) {
                $br = $elem.Current.BoundingRectangle
                $eRect = New-Object System.Drawing.Rectangle ([int]$br.X), ([int]$br.Y), ([int]$br.Width), ([int]$br.Height)
                if ($eRect -ne $script:hoverRect) {
                    $script:hoverRect = $eRect
                    $form.Invalidate()
                }
            }
        } catch {}
    }
})

$form.add_MouseUp({
    param($sender, $e)
    if ($script:mode -eq 0 -and $script:isDrawing) {
        # Freeform release
        $script:isDrawing = $false
        if ($points.Count -ge 3) {
            $minX = $width; $minY = $height; $maxX = 0; $maxY = 0
            foreach ($pt in $points) {
                if ($pt.X -lt $minX) { $minX = $pt.X }
                if ($pt.Y -lt $minY) { $minY = $pt.Y }
                if ($pt.X -gt $maxX) { $maxX = $pt.X }
                if ($pt.Y -gt $maxY) { $maxY = $pt.Y }
            }

            $cropX = [Math]::Max(0, $minX)
            $cropY = [Math]::Max(0, $minY)
            $cropW = [Math]::Min($width - $cropX, $maxX - $minX)
            $cropH = [Math]::Min($height - $cropY, $maxY - $minY)

            $shapePath = New-Object System.Drawing.Drawing2D.GraphicsPath
            $shapePath.AddLines($points.ToArray())
            $shapePath.CloseFigure()

            $cropRect = New-Object System.Drawing.Rectangle ($cropX + $left), ($cropY + $top), $cropW, $cropH
            SaveCroppedArea $cropRect $shapePath
            $shapePath.Dispose()
        } else {
            $form.Close()
        }
    } elseif ($script:mode -eq 1 -and $script:isDrawing) {
        # Rectangle release
        $script:isDrawing = $false
        $rx = [Math]::Min($script:rectStart.X, $script:rectCurrent.X)
        $ry = [Math]::Min($script:rectStart.Y, $script:rectCurrent.Y)
        $rw = [Math]::Abs($script:rectCurrent.X - $script:rectStart.X)
        $rh = [Math]::Abs($script:rectCurrent.Y - $script:rectStart.Y)

        if ($rw -gt 10 -and $rh -gt 10) {
            $cropRect = New-Object System.Drawing.Rectangle ($rx + $left), ($ry + $top), $rw, $rh
            SaveCroppedArea $cropRect
        } else {
            $form.Close()
        }
    }
})

$form.add_KeyDown({
    param($sender, $e)
    if ($e.KeyCode -eq [System.Windows.Forms.Keys]::Escape) {
        $form.Close()
    } elseif ($e.KeyCode -eq [System.Windows.Forms.Keys]::Menu -or $e.KeyCode -eq [System.Windows.Forms.Keys]::Tab -or $e.KeyCode -eq [System.Windows.Forms.Keys]::Space) {
        # Cycle mode
        $script:mode = ($script:mode + 1) % 4
        $points.Clear()
        $script:isDrawing = $false
        $script:hoverRect = [System.Drawing.Rectangle]::Empty
        $form.Invalidate()
    } elseif ($e.KeyCode -eq [System.Windows.Forms.Keys]::D1 -or $e.KeyCode -eq [System.Windows.Forms.Keys]::NumPad1) {
        $script:mode = 0
        $points.Clear(); $script:isDrawing = $false; $script:hoverRect = [System.Drawing.Rectangle]::Empty
        $form.Invalidate()
    } elseif ($e.KeyCode -eq [System.Windows.Forms.Keys]::D2 -or $e.KeyCode -eq [System.Windows.Forms.Keys]::NumPad2) {
        $script:mode = 1
        $points.Clear(); $script:isDrawing = $false; $script:hoverRect = [System.Drawing.Rectangle]::Empty
        $form.Invalidate()
    } elseif ($e.KeyCode -eq [System.Windows.Forms.Keys]::D3 -or $e.KeyCode -eq [System.Windows.Forms.Keys]::NumPad3) {
        $script:mode = 2
        $points.Clear(); $script:isDrawing = $false; $script:hoverRect = [System.Drawing.Rectangle]::Empty
        $form.Invalidate()
    } elseif ($e.KeyCode -eq [System.Windows.Forms.Keys]::D4 -or $e.KeyCode -eq [System.Windows.Forms.Keys]::NumPad4) {
        $script:mode = 3
        $points.Clear(); $script:isDrawing = $false; $script:hoverRect = [System.Drawing.Rectangle]::Empty
        $form.Invalidate()
    }
})

[void]$form.ShowDialog()

# Cleanup
$captureBmp.Dispose()
$displayBmp.Dispose()
$darkPen.Dispose()
$lightPen.Dispose()
$bluePen.Dispose()
$hudFont.Dispose()
$hudSubFont.Dispose()
$hudBgBrush.Dispose()
$hudActiveBrush.Dispose()
$whiteBrush.Dispose()
$dimTextBrush.Dispose()
$hudBorderPen.Dispose()
$customCursor.Dispose()
$cursorBmp.Dispose()
$form.Dispose()

if ($script:saved) {
    exit 0
} else {
    exit 1
}
