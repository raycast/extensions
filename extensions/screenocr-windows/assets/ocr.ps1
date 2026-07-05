# ==============================================================================
# ScreenOCR for Windows - capture + OCR helper
#
# Runs only for the duration of one capture, then exits. No background process.
# OCR is performed 100% locally via the Windows.Media.Ocr WinRT API using the
# language packs installed in Windows. Nothing ever leaves the machine.
#
# Exit codes:
#   0 = success (recognized text written to stdout as UTF-8; may be empty)
#   2 = user cancelled the selection (Esc / right-click / zero-size selection)
#   3 = no OCR language pack available for the requested language
#   4 = no image found (clipboard mode only)
#   5 = unexpected error (message on stderr)
# ==============================================================================

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('area', 'fullscreen', 'clipboard')]
    [string]$Mode,

    [ValidatePattern('^(auto|[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3})$')]
    [string]$Language = 'auto',

    [switch]$IgnoreLineBreaks
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

# ------------------------------------------------------------------ DPI setup
# Must run before any window/screen APIs so pixel coordinates are physical.
Add-Type -Namespace ScreenOcrNative -Name Dpi -MemberDefinition @'
[DllImport("user32.dll")]
public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
[DllImport("user32.dll")]
public static extern bool SetProcessDPIAware();
'@
# -4 = DPI_AWARENESS_CONTEXT_PER_MONITOR_AWARE_V2, fall back to system aware.
# (SetProcessDpiAwarenessContext requires Windows 10 1703+; guard for older builds.)
try {
    if (-not [ScreenOcrNative.Dpi]::SetProcessDpiAwarenessContext([IntPtr]::new(-4))) {
        [void][ScreenOcrNative.Dpi]::SetProcessDPIAware()
    }
}
catch {
    [void][ScreenOcrNative.Dpi]::SetProcessDPIAware()
}

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Runtime.WindowsRuntime

# ------------------------------------------------------------ WinRT plumbing
$null = [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
$null = [Windows.Globalization.Language,Windows.Foundation,ContentType=WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream,Windows.Foundation,ContentType=WindowsRuntime]

$script:AsTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
        $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    })[0]

function Wait-WinRtOperation {
    param($Operation, [Type]$ResultType)
    $task = $script:AsTaskGeneric.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    $task.Wait() | Out-Null
    return $task.Result
}

# --------------------------------------------------------------- OCR engine
function New-OcrEngine {
    param([string]$LanguageTag)
    if ($LanguageTag -ne 'auto') {
        $lang = New-Object Windows.Globalization.Language ($LanguageTag)
        if ([Windows.Media.Ocr.OcrEngine]::IsLanguageSupported($lang)) {
            $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($lang)
            if ($engine) { return $engine }
        }
        # Requested language pack not installed -> fall back to user profile.
    }
    return [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
}

function Invoke-Ocr {
    param([System.Drawing.Bitmap]$Bitmap, [string]$LanguageTag, [bool]$JoinLines)

    $engine = New-OcrEngine -LanguageTag $LanguageTag
    if (-not $engine) { exit 3 }

    # Windows OCR rejects images above MaxImageDimension; downscale to fit.
    $maxDim = [Windows.Media.Ocr.OcrEngine]::MaxImageDimension
    $work = $Bitmap
    $scaled = $false
    if ($Bitmap.Width -gt $maxDim -or $Bitmap.Height -gt $maxDim) {
        $ratio = [Math]::Min($maxDim / $Bitmap.Width, $maxDim / $Bitmap.Height)
        $work = Resize-Bitmap -Source $Bitmap -Width ([int][Math]::Floor($Bitmap.Width * $ratio)) -Height ([int][Math]::Floor($Bitmap.Height * $ratio))
        $scaled = $true
    }
    elseif ($Bitmap.Height -lt 300 -and ($Bitmap.Width * 2) -le $maxDim -and ($Bitmap.Height * 2) -le $maxDim) {
        # Small snips recognize noticeably better when upscaled 2x.
        $work = Resize-Bitmap -Source $Bitmap -Width ($Bitmap.Width * 2) -Height ($Bitmap.Height * 2)
        $scaled = $true
    }

    $ms = New-Object System.IO.MemoryStream
    try {
        $work.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $ms.Position = 0
        $ras = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($ms)
        $decoder = Wait-WinRtOperation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($ras)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $softwareBitmap = Wait-WinRtOperation ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        try {
            $result = Wait-WinRtOperation ($engine.RecognizeAsync($softwareBitmap)) ([Windows.Media.Ocr.OcrResult])
        }
        finally {
            $softwareBitmap.Dispose()
        }
    }
    finally {
        $ms.Dispose()
        if ($scaled) { $work.Dispose() }
    }

    $separator = if ($JoinLines) { ' ' } else { "`n" }
    $lines = @($result.Lines | ForEach-Object { $_.Text })
    $text = $lines -join $separator

    # Windows OCR inserts spurious spaces between CJK characters; remove them.
    # \uXXXX escapes keep this file ASCII-only (PS 5.1 reads BOM-less files as ANSI).
    $cjk = '\u2E80-\u9FFF\uF900-\uFAFF\u3000-\u303F\uFF00-\uFFEF'
    $text = [regex]::Replace($text, "(?<=[$cjk])\x20(?=[$cjk])", '')

    return $text
}

function Resize-Bitmap {
    param([System.Drawing.Bitmap]$Source, [int]$Width, [int]$Height)
    $dest = New-Object System.Drawing.Bitmap ($Width, $Height)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    try {
        $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $g.DrawImage($Source, 0, 0, $Width, $Height)
    }
    finally {
        $g.Dispose()
    }
    return $dest
}

# ------------------------------------------------------------ Screen capture
function Get-VirtualScreenBitmap {
    $vs = [System.Windows.Forms.SystemInformation]::VirtualScreen
    $bmp = New-Object System.Drawing.Bitmap ($vs.Width, $vs.Height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    try {
        $g.CopyFromScreen($vs.X, $vs.Y, 0, 0, $bmp.Size)
    }
    finally {
        $g.Dispose()
    }
    return $bmp
}

function Select-ScreenRegion {
    param([System.Drawing.Bitmap]$Frozen)

    $vs = [System.Windows.Forms.SystemInformation]::VirtualScreen

    $form = New-Object System.Windows.Forms.Form
    $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
    $form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
    $form.Bounds = $vs
    $form.TopMost = $true
    $form.ShowInTaskbar = $false
    $form.Cursor = [System.Windows.Forms.Cursors]::Cross
    $form.KeyPreview = $true
    # Enable double buffering to avoid flicker while dragging.
    $form.GetType().GetProperty('DoubleBuffered', [System.Reflection.BindingFlags]'Instance,NonPublic').SetValue($form, $true, $null)

    $state = @{ Dragging = $false; Start = [System.Drawing.Point]::Empty; Current = [System.Drawing.Point]::Empty; Selection = [System.Drawing.Rectangle]::Empty; Done = $false }

    $getRect = {
        $x = [Math]::Min($state.Start.X, $state.Current.X)
        $y = [Math]::Min($state.Start.Y, $state.Current.Y)
        $w = [Math]::Abs($state.Start.X - $state.Current.X)
        $h = [Math]::Abs($state.Start.Y - $state.Current.Y)
        New-Object System.Drawing.Rectangle ($x, $y, $w, $h)
    }

    $dimBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(120, 0, 0, 0))
    $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White, 1)
    $borderPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash

    $form.Add_Paint({
            param($s, $e)
            $g = $e.Graphics
            $g.DrawImageUnscaled($Frozen, 0, 0)
            if ($state.Dragging) {
                $rect = & $getRect
                # Dim everything outside the selection.
                $outside = New-Object System.Drawing.Region ($s.ClientRectangle)
                $outside.Exclude($rect)
                $g.FillRegion($dimBrush, $outside)
                $outside.Dispose()
                if ($rect.Width -gt 0 -and $rect.Height -gt 0) {
                    $g.DrawRectangle($borderPen, $rect.X, $rect.Y, [Math]::Max($rect.Width - 1, 1), [Math]::Max($rect.Height - 1, 1))
                }
            }
            else {
                $g.FillRectangle($dimBrush, $s.ClientRectangle)
            }
        })

    $form.Add_MouseDown({
            param($s, $e)
            if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
                $state.Dragging = $true
                $state.Start = $e.Location
                $state.Current = $e.Location
                $s.Invalidate()
            }
            elseif ($e.Button -eq [System.Windows.Forms.MouseButtons]::Right) {
                $s.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
                $s.Close()
            }
        })

    $form.Add_MouseMove({
            param($s, $e)
            if ($state.Dragging) {
                $state.Current = $e.Location
                $s.Invalidate()
            }
        })

    $form.Add_MouseUp({
            param($s, $e)
            if ($e.Button -eq [System.Windows.Forms.MouseButtons]::Left -and $state.Dragging) {
                $state.Dragging = $false
                $state.Current = $e.Location
                $state.Selection = & $getRect
                $state.Done = $true
                $s.DialogResult = [System.Windows.Forms.DialogResult]::OK
                $s.Close()
            }
        })

    $form.Add_KeyDown({
            param($s, $e)
            if ($e.KeyCode -eq [System.Windows.Forms.Keys]::Escape) {
                $s.DialogResult = [System.Windows.Forms.DialogResult]::Cancel
                $s.Close()
            }
        })

    $form.Add_Shown({ param($s, $e) $s.Activate() })

    $dialogResult = $form.ShowDialog()
    $dimBrush.Dispose()
    $borderPen.Dispose()
    $form.Dispose()

    if ($dialogResult -ne [System.Windows.Forms.DialogResult]::OK -or -not $state.Done) { return $null }
    $sel = $state.Selection
    if ($sel.Width -lt 3 -or $sel.Height -lt 3) { return $null }
    return $sel
}

function Get-ClipboardBitmap {
    if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
        $img = [System.Windows.Forms.Clipboard]::GetImage()
        if ($img) { return New-Object System.Drawing.Bitmap ($img) }
    }
    if ([System.Windows.Forms.Clipboard]::ContainsFileDropList()) {
        $files = [System.Windows.Forms.Clipboard]::GetFileDropList()
        foreach ($file in $files) {
            if ($file -match '\.(png|jpe?g|bmp|gif|tiff?|webp)$') {
                try { return New-Object System.Drawing.Bitmap ($file) } catch {}
            }
        }
    }
    return $null
}

# -------------------------------------------------------------------- Main
try {
    $bitmap = $null
    switch ($Mode) {
        'area' {
            $frozen = Get-VirtualScreenBitmap
            try {
                $sel = Select-ScreenRegion -Frozen $frozen
                if (-not $sel) { exit 2 }
                $bitmap = $frozen.Clone($sel, $frozen.PixelFormat)
            }
            finally {
                $frozen.Dispose()
            }
        }
        'fullscreen' {
            $bitmap = Get-VirtualScreenBitmap
        }
        'clipboard' {
            $bitmap = Get-ClipboardBitmap
            if (-not $bitmap) { exit 4 }
        }
    }

    try {
        $text = Invoke-Ocr -Bitmap $bitmap -LanguageTag $Language -JoinLines:$IgnoreLineBreaks.IsPresent
    }
    finally {
        $bitmap.Dispose()
    }

    # Write raw UTF-8 bytes so the output encoding never depends on the
    # console code page of the hidden host window.
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    $stdout = [Console]::OpenStandardOutput()
    $stdout.Write($bytes, 0, $bytes.Length)
    $stdout.Flush()
    exit 0
}
catch {
    [Console]::Error.WriteLine($_.Exception.ToString())
    exit 5
}
