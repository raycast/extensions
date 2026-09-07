# ScreenOCR Windows helper. Runs on demand under Windows PowerShell 5.1.
# Stdout is reserved for one JSON protocol message; diagnostics use stderr.
param(
    [ValidateSet('area', 'fullscreen', 'clipboard')]
    [string]$Mode,
    [ValidatePattern('^(auto|[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3})$')]
    [string]$Language = 'auto',
    [switch]$IgnoreLineBreaks,
    [switch]$ListLanguages
)

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false } catch {}

function Write-ProtocolJson {
    param([object]$Value)
    $json = ConvertTo-Json -InputObject $Value -Compress -Depth 5
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
    $stdout = [Console]::OpenStandardOutput()
    $stdout.Write($bytes, 0, $bytes.Length)
    $stdout.Flush()
}

function Wait-WinRtOperation {
    param($Operation, [Type]$ResultType)
    $task = $script:AsTaskGeneric.MakeGenericMethod($ResultType).Invoke($null, @($Operation))
    $task.Wait()
    return $task.Result
}

function New-CompatibleBitmap {
    param([System.Drawing.Image]$Source)
    if ($Source.Width -lt 1 -or $Source.Height -lt 1) { throw 'The image has invalid dimensions.' }
    $bitmap = New-Object System.Drawing.Bitmap ($Source.Width, $Source.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = $null
    try {
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.DrawImage($Source, 0, 0, $Source.Width, $Source.Height)
        return $bitmap
    }
    catch {
        $bitmap.Dispose()
        throw
    }
    finally {
        if ($graphics) { $graphics.Dispose() }
    }
}

function Resize-Bitmap {
    param([System.Drawing.Bitmap]$Source, [int]$Width, [int]$Height)
    $width = [Math]::Max(1, $Width)
    $height = [Math]::Max(1, $Height)
    $dest = New-Object System.Drawing.Bitmap ($width, $height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = $null
    try {
        $graphics = [System.Drawing.Graphics]::FromImage($dest)
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($Source, 0, 0, $width, $height)
        return $dest
    }
    catch {
        $dest.Dispose()
        throw
    }
    finally {
        if ($graphics) { $graphics.Dispose() }
    }
}

function New-OcrEngine {
    param([string]$LanguageTag)
    if ($LanguageTag -eq 'auto') {
        return [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
    }
    $requested = New-Object Windows.Globalization.Language ($LanguageTag)
    if (-not [Windows.Media.Ocr.OcrEngine]::IsLanguageSupported($requested)) { return $null }
    return [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage($requested)
}

function Normalize-OcrLine {
    param([string]$Text, [string]$LanguageTag)
    if ($LanguageTag -notmatch '^(zh|ja)(-|$)') { return $Text }
    # Remove only the common intra-CJK OCR artifact. Fullwidth forms and Hangul
    # are deliberately excluded so their token boundaries remain intact.
    $han = '\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF'
    $kana = '\u3040-\u30FF'
    $value = [regex]::Replace($Text, "(?<=[$han])\x20(?=[$han])", '')
    return [regex]::Replace($value, "(?<=[$kana])\x20(?=[$han$kana])|(?<=[$han])\x20(?=[$kana])", '')
}

function Invoke-Ocr {
    param([System.Drawing.Bitmap]$Bitmap, [string]$LanguageTag, [bool]$JoinLines)
    $engine = New-OcrEngine $LanguageTag
    if (-not $engine) { throw [System.InvalidOperationException]::new('OCR_LANGUAGE_UNAVAILABLE') }

    $work = $Bitmap
    $ownsWork = $false
    $stream = $null
    $randomAccessStream = $null
    $softwareBitmap = $null
    try {
        $maxDimension = [Windows.Media.Ocr.OcrEngine]::MaxImageDimension
        if ($Bitmap.Width -gt $maxDimension -or $Bitmap.Height -gt $maxDimension) {
            $ratio = [Math]::Min($maxDimension / [double]$Bitmap.Width, $maxDimension / [double]$Bitmap.Height)
            $width = [Math]::Max(1, [Math]::Min($maxDimension, [int][Math]::Floor($Bitmap.Width * $ratio)))
            $height = [Math]::Max(1, [Math]::Min($maxDimension, [int][Math]::Floor($Bitmap.Height * $ratio)))
            $work = Resize-Bitmap $Bitmap $width $height
            $ownsWork = $true
        }
        elseif ($Bitmap.Height -lt 300 -and $Bitmap.Width -le [Math]::Floor($maxDimension / 2) -and $Bitmap.Height -le [Math]::Floor($maxDimension / 2)) {
            $work = Resize-Bitmap $Bitmap ([Math]::Max(1, $Bitmap.Width * 2)) ([Math]::Max(1, $Bitmap.Height * 2))
            $ownsWork = $true
        }

        $stream = New-Object System.IO.MemoryStream
        $work.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
        $stream.Position = 0
        $randomAccessStream = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($stream)
        $decoder = Wait-WinRtOperation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($randomAccessStream)) ([Windows.Graphics.Imaging.BitmapDecoder])
        $softwareBitmap = Wait-WinRtOperation ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
        $result = Wait-WinRtOperation ($engine.RecognizeAsync($softwareBitmap)) ([Windows.Media.Ocr.OcrResult])
        $lines = @($result.Lines | ForEach-Object { Normalize-OcrLine $_.Text $engine.RecognizerLanguage.LanguageTag })
        $separator = if ($JoinLines) { ' ' } else { "`n" }
        return $lines -join $separator
    }
    finally {
        if ($softwareBitmap) { $softwareBitmap.Dispose() }
        if ($randomAccessStream) { $randomAccessStream.Dispose() }
        if ($stream) { $stream.Dispose() }
        if ($ownsWork -and $work) { $work.Dispose() }
    }
}

function Get-VirtualScreenBitmap {
    $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
    if ($bounds.Width -lt 1 -or $bounds.Height -lt 1) { throw 'The virtual desktop has invalid dimensions.' }
    $bitmap = New-Object System.Drawing.Bitmap ($bounds.Width, $bounds.Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = $null
    try {
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.CopyFromScreen($bounds.X, $bounds.Y, 0, 0, $bitmap.Size)
        return $bitmap
    }
    catch {
        $bitmap.Dispose()
        throw
    }
    finally {
        if ($graphics) { $graphics.Dispose() }
    }
}

function Select-ScreenRegion {
    param([System.Drawing.Bitmap]$Frozen)
    $bounds = [System.Windows.Forms.SystemInformation]::VirtualScreen
    $form = New-Object System.Windows.Forms.Form
    $dimBrush = $null
    $borderPen = $null
    try {
        $form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
        $form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
        $form.Bounds = $bounds
        $form.TopMost = $true
        $form.ShowInTaskbar = $false
        $form.Cursor = [System.Windows.Forms.Cursors]::Cross
        $form.KeyPreview = $true
        $form.GetType().GetProperty('DoubleBuffered', [System.Reflection.BindingFlags]'Instance,NonPublic').SetValue($form, $true, $null)
        $state = @{ Dragging = $false; Start = [System.Drawing.Point]::Empty; Current = [System.Drawing.Point]::Empty; Selection = [System.Drawing.Rectangle]::Empty; Done = $false }
        $getRectangle = {
            $x = [Math]::Max(0, [Math]::Min($Frozen.Width, [Math]::Min($state.Start.X, $state.Current.X)))
            $y = [Math]::Max(0, [Math]::Min($Frozen.Height, [Math]::Min($state.Start.Y, $state.Current.Y)))
            $right = [Math]::Max(0, [Math]::Min($Frozen.Width, [Math]::Max($state.Start.X, $state.Current.X)))
            $bottom = [Math]::Max(0, [Math]::Min($Frozen.Height, [Math]::Max($state.Start.Y, $state.Current.Y)))
            New-Object System.Drawing.Rectangle ($x, $y, [Math]::Max(0, $right - $x), [Math]::Max(0, $bottom - $y))
        }
        $dimBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(120, 0, 0, 0))
        $borderPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White, 1)
        $borderPen.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
        $form.Add_Paint({
            param($sender, $event)
            $event.Graphics.DrawImageUnscaled($Frozen, 0, 0)
            if ($state.Dragging) {
                $rectangle = & $getRectangle
                $outside = New-Object System.Drawing.Region ($sender.ClientRectangle)
                try { $outside.Exclude($rectangle); $event.Graphics.FillRegion($dimBrush, $outside) } finally { $outside.Dispose() }
                if ($rectangle.Width -gt 0 -and $rectangle.Height -gt 0) {
                    $event.Graphics.DrawRectangle($borderPen, $rectangle.X, $rectangle.Y, [Math]::Max(1, $rectangle.Width - 1), [Math]::Max(1, $rectangle.Height - 1))
                }
            } else { $event.Graphics.FillRectangle($dimBrush, $sender.ClientRectangle) }
        })
        $form.Add_MouseDown({
            param($sender, $event)
            if ($event.Button -eq [System.Windows.Forms.MouseButtons]::Left) {
                $state.Dragging = $true; $state.Start = $event.Location; $state.Current = $event.Location; $sender.Invalidate()
            } elseif ($event.Button -eq [System.Windows.Forms.MouseButtons]::Right) {
                $sender.DialogResult = [System.Windows.Forms.DialogResult]::Cancel; $sender.Close()
            }
        })
        $form.Add_MouseMove({ param($sender, $event) if ($state.Dragging) { $state.Current = $event.Location; $sender.Invalidate() } })
        $form.Add_MouseUp({
            param($sender, $event)
            if ($event.Button -eq [System.Windows.Forms.MouseButtons]::Left -and $state.Dragging) {
                $state.Dragging = $false; $state.Current = $event.Location; $state.Selection = & $getRectangle; $state.Done = $true
                $sender.DialogResult = [System.Windows.Forms.DialogResult]::OK; $sender.Close()
            }
        })
        $form.Add_KeyDown({ param($sender, $event) if ($event.KeyCode -eq [System.Windows.Forms.Keys]::Escape) { $sender.DialogResult = [System.Windows.Forms.DialogResult]::Cancel; $sender.Close() } })
        $form.Add_Shown({ param($sender, $event) $sender.Activate() })
        $dialogResult = $form.ShowDialog()
        if ($dialogResult -ne [System.Windows.Forms.DialogResult]::OK -or -not $state.Done) { return $null }
        if ($state.Selection.Width -lt 3 -or $state.Selection.Height -lt 3) { return $null }
        return $state.Selection
    }
    finally {
        if ($dimBrush) { $dimBrush.Dispose() }
        if ($borderPen) { $borderPen.Dispose() }
        $form.Dispose()
    }
}

function Read-ClipboardBitmapOnce {
    if ([System.Windows.Forms.Clipboard]::ContainsImage()) {
        $image = [System.Windows.Forms.Clipboard]::GetImage()
        if ($image) { try { return @{ Kind = 'image'; Bitmap = (New-CompatibleBitmap $image) } } finally { $image.Dispose() } }
    }
    if (-not [System.Windows.Forms.Clipboard]::ContainsFileDropList()) { return @{ Kind = 'empty' } }
    $files = [System.Windows.Forms.Clipboard]::GetFileDropList()
    $supported = @('.bmp', '.gif', '.jpg', '.jpeg', '.png', '.tif', '.tiff')
    $foundUnsupported = $false
    $foundCorrupt = $false
    foreach ($file in $files) {
        $extension = [System.IO.Path]::GetExtension($file).ToLowerInvariant()
        if ($supported -notcontains $extension) { $foundUnsupported = $true; continue }
        $stream = $null
        $image = $null
        try {
            $stream = New-Object System.IO.FileStream ($file, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
            $image = [System.Drawing.Image]::FromStream($stream, $true, $true)
            return @{ Kind = 'image'; Bitmap = (New-CompatibleBitmap $image) }
        }
        catch { $foundCorrupt = $true }
        finally { if ($image) { $image.Dispose() }; if ($stream) { $stream.Dispose() } }
    }
    if ($foundCorrupt) { return @{ Kind = 'corrupt' } }
    if ($foundUnsupported) { return @{ Kind = 'unsupported' } }
    return @{ Kind = 'empty' }
}

function Get-ClipboardBitmap {
    for ($attempt = 0; $attempt -lt 6; $attempt++) {
        try { return Read-ClipboardBitmapOnce }
        catch [System.Runtime.InteropServices.ExternalException] {
            if ($attempt -eq 5) { throw 'SCREENOCR_CLIPBOARD_BUSY' }
            Start-Sleep -Milliseconds 50
        }
    }
}

$exitCode = 0
try {
    if (-not $ListLanguages -and -not $Mode) { throw 'Mode is required.' }
    Add-Type -AssemblyName System.Windows.Forms
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $null = [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
    $null = [Windows.Globalization.Language,Windows.Foundation,ContentType=WindowsRuntime]
    $null = [Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]
    $script:AsTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    })[0]
    if (-not $script:AsTaskGeneric) { throw 'Windows Runtime initialization failed.' }

    if ($ListLanguages) {
        $available = @([Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages | ForEach-Object {
            @{ tag = $_.LanguageTag; displayName = $_.DisplayName }
        })
        Write-ProtocolJson @{ status = 'languages'; languages = $available }
        exit 0
    }

    Add-Type -Namespace ScreenOcrNative -Name Dpi -MemberDefinition @'
[DllImport("user32.dll")]
public static extern bool SetProcessDpiAwarenessContext(IntPtr value);
[DllImport("user32.dll")]
public static extern bool SetProcessDPIAware();
'@
    try {
        if (-not [ScreenOcrNative.Dpi]::SetProcessDpiAwarenessContext([IntPtr]::new(-4))) { [void][ScreenOcrNative.Dpi]::SetProcessDPIAware() }
    } catch { [void][ScreenOcrNative.Dpi]::SetProcessDPIAware() }

    $bitmap = $null
    try {
        if ($Mode -eq 'area') {
            $frozen = Get-VirtualScreenBitmap
            try {
                $selection = Select-ScreenRegion $frozen
                if (-not $selection) { throw 'SCREENOCR_CANCELLED' }
                $bitmap = $frozen.Clone($selection, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
            } finally { $frozen.Dispose() }
        } elseif ($Mode -eq 'fullscreen') {
            $bitmap = Get-VirtualScreenBitmap
        } else {
            $clipboard = Get-ClipboardBitmap
            if ($clipboard.Kind -ne 'image') {
                throw "SCREENOCR_CLIPBOARD_$($clipboard.Kind.ToUpperInvariant())"
            }
            $bitmap = $clipboard.Bitmap
        }
        $text = Invoke-Ocr $bitmap $Language $IgnoreLineBreaks.IsPresent
        if ([string]::IsNullOrWhiteSpace($text)) { Write-ProtocolJson @{ status = 'no-text' } }
        else { Write-ProtocolJson @{ status = 'recognized'; text = $text } }
    } finally { if ($bitmap) { $bitmap.Dispose() } }
}
catch {
    if ($_.Exception.Message -eq 'SCREENOCR_CANCELLED') { $exitCode = 2 }
    elseif ($_.Exception.Message -eq 'OCR_LANGUAGE_UNAVAILABLE') { $exitCode = 3 }
    elseif ($_.Exception.Message -eq 'SCREENOCR_CLIPBOARD_EMPTY') {
        Write-ProtocolJson @{ status = 'error'; code = 'clipboard-empty' }; $exitCode = 4
    }
    elseif ($_.Exception.Message -eq 'SCREENOCR_CLIPBOARD_UNSUPPORTED') {
        Write-ProtocolJson @{ status = 'error'; code = 'clipboard-unsupported' }; $exitCode = 4
    }
    elseif ($_.Exception.Message -eq 'SCREENOCR_CLIPBOARD_CORRUPT') {
        Write-ProtocolJson @{ status = 'error'; code = 'clipboard-corrupt' }; $exitCode = 4
    }
    elseif ($_.Exception.Message -eq 'SCREENOCR_CLIPBOARD_BUSY') {
        Write-ProtocolJson @{ status = 'error'; code = 'clipboard-busy' }; $exitCode = 4
    }
    else { $exitCode = 5; [Console]::Error.WriteLine($_.Exception.ToString()) }
}
exit $exitCode
