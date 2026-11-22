# Windows backend for Hide Details. Runs in Windows PowerShell 5.1 with built-in WinRT OCR and face detection.
# Protocol: one JSON request per stdin line, one JSON response per stdout line, errors on stderr with exit code 1.
# Unredacted images stay in memory; only the redacted PNG is written to disk.

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version 2

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Runtime.WindowsRuntime
Add-Type -Namespace HideDetails -Name Native -MemberDefinition @'
[DllImport("user32.dll")] public static extern uint GetClipboardSequenceNumber();
'@
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Media.FaceAnalysis.FaceDetector, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.SoftwareBitmap, Windows.Foundation, ContentType = WindowsRuntime]

$NoImage = 'Clipboard has no image. Copy a screenshot first.'
$Changed = 'The clipboard changed while scanning. The newer clipboard was kept. Scan the current clipboard again.'

$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
  $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1

function Await($operation, [Type]$type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($operation))
  $null = $task.Wait(-1)
  $task.Result
}

function Write-Response($value) {
  $json = ConvertTo-Json -InputObject $value -Depth 6 -Compress
  # Escape non-ASCII so the response survives any console code page.
  $json = [regex]::Replace($json, '[^\x00-\x7F]', { param($m) '\u{0:x4}' -f [int][char]$m.Value })
  [Console]::Out.WriteLine($json)
  [Console]::Out.Flush()
}

function Read-Request {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { throw 'The redaction request was interrupted. Try scanning again.' }
  ConvertFrom-Json $line
}

function Get-Innermost([Exception]$exception) {
  while ($exception.InnerException) { $exception = $exception.InnerException }
  $exception
}

function Get-ClipboardSequence { [HideDetails.Native]::GetClipboardSequenceNumber() }

function Copy-Bitmap([System.Drawing.Image]$image) {
  $copy = New-Object System.Drawing.Bitmap $image.Width, $image.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($copy)
  try {
    $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
    $graphics.DrawImage($image, (New-Object System.Drawing.Rectangle 0, 0, $image.Width, $image.Height))
  } finally { $graphics.Dispose() }
  $copy
}

function Read-BitmapBytes([byte[]]$bytes) {
  $stream = New-Object System.IO.MemoryStream (, $bytes)
  try {
    $image = [System.Drawing.Image]::FromStream($stream)
    try { Copy-Bitmap $image } finally { $image.Dispose() }
  } finally { $stream.Dispose() }
}

function Read-StreamBitmap($value) {
  if ($value -isnot [System.IO.Stream]) { return $null }
  $buffer = New-Object System.IO.MemoryStream
  try {
    $value.CopyTo($buffer)
    Read-BitmapBytes $buffer.ToArray()
  } catch { $null } finally { $buffer.Dispose() }
}

function Read-ClipboardBitmap {
  $before = Get-ClipboardSequence
  $bitmap = $null
  $data = [System.Windows.Forms.Clipboard]::GetDataObject()
  if ($data) {
    if ($data.GetDataPresent('PNG')) { $bitmap = Read-StreamBitmap $data.GetData('PNG') }
    if (-not $bitmap -and $data.GetDataPresent([System.Windows.Forms.DataFormats]::Bitmap)) {
      $image = $data.GetData([System.Windows.Forms.DataFormats]::Bitmap)
      if ($image -is [System.Drawing.Image]) { $bitmap = Copy-Bitmap $image }
    }
    if (-not $bitmap -and $data.GetDataPresent([System.Windows.Forms.DataFormats]::FileDrop)) {
      $files = @($data.GetData([System.Windows.Forms.DataFormats]::FileDrop))
      if ($files.Count -eq 1) {
        try { $bitmap = Read-BitmapBytes ([System.IO.File]::ReadAllBytes($files[0])) } catch { $bitmap = $null }
      }
    }
  }
  if ((Get-ClipboardSequence) -ne $before) { throw $Changed }
  if (-not $bitmap) { throw $NoImage }
  @{ Bitmap = $bitmap; ChangeCount = $before }
}

function Read-FileBitmap([string]$path) {
  try { Read-BitmapBytes ([System.IO.File]::ReadAllBytes($path)) }
  catch { throw 'Could not read the input image. Choose a PNG, JPEG, BMP, GIF, or TIFF image.' }
}

function Resize-Bitmap([System.Drawing.Bitmap]$bitmap, [double]$scale) {
  $width = [Math]::Max(1, [int][Math]::Round($bitmap.Width * $scale))
  $height = [Math]::Max(1, [int][Math]::Round($bitmap.Height * $scale))
  $resized = New-Object System.Drawing.Bitmap $width, $height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($resized)
  try {
    $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $graphics.DrawImage($bitmap, (New-Object System.Drawing.Rectangle 0, 0, $width, $height))
  } finally { $graphics.Dispose() }
  $resized
}

function ConvertTo-SoftwareBitmap([System.Drawing.Bitmap]$bitmap) {
  $stream = New-Object System.IO.MemoryStream
  $bitmap.Save($stream, [System.Drawing.Imaging.ImageFormat]::Png)
  $stream.Position = 0
  $random = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($stream)
  $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($random)) ([Windows.Graphics.Imaging.BitmapDecoder])
  Await ($decoder.GetSoftwareBitmapAsync(
      [Windows.Graphics.Imaging.BitmapPixelFormat]::Bgra8,
      [Windows.Graphics.Imaging.BitmapAlphaMode]::Premultiplied)) ([Windows.Graphics.Imaging.SoftwareBitmap])
}

function Test-CustomRegex($expression, [string]$text) {
  if (-not $expression) { return $false }
  try {
    foreach ($match in $expression.Matches($text)) { if ($match.Length -gt 0) { return $true } }
    return $false
  } catch {
    if ((Get-Innermost $_.Exception) -is [System.Text.RegularExpressions.RegexMatchTimeoutException]) {
      throw 'Custom Regex took too long. Simplify the pattern in extension preferences.'
    }
    throw 'Custom Regex could not be evaluated. Check the pattern in extension preferences.'
  }
}

function Find-TextLines([System.Drawing.Bitmap]$bitmap, [string]$recognition, $expression) {
  $engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
  if (-not $engine) { throw 'Text recognition is unavailable. Add a Windows display language with OCR support in Settings.' }
  # Accurate mode upscales the image so small text has more pixels to work with.
  $scale = if ($recognition -eq 'accurate') { 2.0 } else { 1.0 }
  $limit = [double][Windows.Media.Ocr.OcrEngine]::MaxImageDimension
  $scale = [Math]::Min($scale, $limit / [Math]::Max($bitmap.Width, $bitmap.Height))
  $source = if ($scale -ne 1.0) { Resize-Bitmap $bitmap $scale } else { $bitmap }
  $width = $source.Width
  $height = $source.Height
  try {
    $software = ConvertTo-SoftwareBitmap $source
    $result = Await ($engine.RecognizeAsync($software)) ([Windows.Media.Ocr.OcrResult])
  } finally { if ($source -ne $bitmap) { $source.Dispose() } }
  $lines = New-Object System.Collections.ArrayList
  foreach ($line in $result.Lines) {
    $left = [double]::MaxValue; $top = [double]::MaxValue; $right = 0.0; $bottom = 0.0
    foreach ($word in $line.Words) {
      $rect = $word.BoundingRect
      $left = [Math]::Min($left, $rect.X); $top = [Math]::Min($top, $rect.Y)
      $right = [Math]::Max($right, $rect.X + $rect.Width); $bottom = [Math]::Max($bottom, $rect.Y + $rect.Height)
    }
    if ($right -le $left -or $bottom -le $top) { continue }
    $null = $lines.Add(@{
        text   = $line.Text
        custom = (Test-CustomRegex $expression $line.Text)
        box    = @{ x = $left; y = $top; width = $right - $left; height = $bottom - $top }
      })
  }
  # Keep OCR coordinates and metadata together so the caller can undo deskewing before masking.
  $angle = if ($null -ne $result.TextAngle) { [double]$result.TextAngle } else { 0.0 }
  @{ lines = $lines; width = $width; height = $height; angle = $angle }
}

function Find-Faces([System.Drawing.Bitmap]$bitmap) {
  if (-not [Windows.Media.FaceAnalysis.FaceDetector]::IsSupported) {
    throw 'Face detection is unavailable on this PC. Remove face from What to Hide in extension preferences.'
  }
  $detector = Await ([Windows.Media.FaceAnalysis.FaceDetector]::CreateAsync()) ([Windows.Media.FaceAnalysis.FaceDetector])
  $gray = [Windows.Graphics.Imaging.SoftwareBitmap]::Convert((ConvertTo-SoftwareBitmap $bitmap), [Windows.Graphics.Imaging.BitmapPixelFormat]::Gray8)
  $found = Await ($detector.DetectFacesAsync($gray)) ([System.Collections.Generic.IList[Windows.Media.FaceAnalysis.DetectedFace]])
  $faces = New-Object System.Collections.ArrayList
  foreach ($face in $found) {
    $box = $face.FaceBox
    $null = $faces.Add(@{ x = [double]$box.X; y = [double]$box.Y; width = [double]$box.Width; height = [double]$box.Height })
  }
  , $faces
}

function Render([System.Drawing.Bitmap]$source, $regions, [string]$style, [string]$output) {
  $canvas = Copy-Bitmap $source
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  try {
    $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
    $attributes = New-Object System.Drawing.Imaging.ImageAttributes
    $attributes.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
    foreach ($region in $regions) {
      $regionStyle = $style
      if ($region.PSObject.Properties['style']) { $regionStyle = [string]$region.style }
      if ($regionStyle -notin @('blackout', 'blur', 'pixelate')) { throw 'Invalid redaction style.' }
      $x = [int]$region.x; $y = [int]$region.y; $width = [int]$region.width; $height = [int]$region.height
      if ($x -lt 0 -or $y -lt 0 -or $width -le 0 -or $height -le 0 -or $x + $width -gt $source.Width -or $y + $height -gt $source.Height) {
        throw 'Redaction region exceeds the image. No image was published.'
      }
      $target = New-Object System.Drawing.Rectangle $x, $y, $width, $height
      if ($regionStyle -eq 'blackout') {
        $graphics.FillRectangle([System.Drawing.Brushes]::Black, $target)
        continue
      }
      # Pixelate keeps hard blocks; blur downsamples smoothly and scales back up.
      if ($regionStyle -eq 'pixelate') {
        $block = [Math]::Max(8, [int][Math]::Floor([Math]::Min($width, $height) / 8))
        $mode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
      } else {
        $block = 12
        $mode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      }
      $smallWidth = [Math]::Max(1, [int][Math]::Floor($width / $block))
      $smallHeight = [Math]::Max(1, [int][Math]::Floor($height / $block))
      $small = New-Object System.Drawing.Bitmap $smallWidth, $smallHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
      $smallGraphics = [System.Drawing.Graphics]::FromImage($small)
      try {
        $smallGraphics.InterpolationMode = if ($regionStyle -eq 'pixelate') { [System.Drawing.Drawing2D.InterpolationMode]::Bilinear } else { $mode }
        $smallGraphics.DrawImage($source, (New-Object System.Drawing.Rectangle 0, 0, $smallWidth, $smallHeight),
          $x, $y, $width, $height, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
      } finally { $smallGraphics.Dispose() }
      try {
        $graphics.InterpolationMode = $mode
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.DrawImage($small, $target, 0, 0, $smallWidth, $smallHeight, [System.Drawing.GraphicsUnit]::Pixel, $attributes)
      } finally { $small.Dispose() }
    }
  } finally { $graphics.Dispose() }
  $temporary = "$output.partial"
  try {
    $canvas.Save($temporary, [System.Drawing.Imaging.ImageFormat]::Png)
    [System.IO.File]::Move($temporary, $output)
  } catch {
    Remove-Item -LiteralPath $temporary -Force -ErrorAction SilentlyContinue
    throw 'Could not encode the redacted image. No image was published.'
  } finally { $canvas.Dispose() }
}

function Invoke-Scan($request) {
  $expression = $null
  if ($request.customRegex) {
    try {
      $expression = New-Object System.Text.RegularExpressions.Regex $request.customRegex,
        ([System.Text.RegularExpressions.RegexOptions]::None), ([TimeSpan]::FromMilliseconds(100))
    } catch { throw 'Invalid Custom Regex. Check the pattern in extension preferences.' }
  }
  if ($request.inputPath) {
    $bitmap = Read-FileBitmap $request.inputPath
    $changeCount = $null
  } else {
    $clipboard = Read-ClipboardBitmap
    $bitmap = $clipboard.Bitmap
    $changeCount = $clipboard.ChangeCount
  }
  try {
    $text = if ($request.text) { Find-TextLines $bitmap $request.recognition $expression } else {
      @{ lines = @(); width = $bitmap.Width; height = $bitmap.Height; angle = 0.0 }
    }
    $faces = if ($request.faces) { Find-Faces $bitmap } else { New-Object System.Collections.ArrayList }
    Write-Response @{ width = $bitmap.Width; height = $bitmap.Height; changeCount = $changeCount; text = $text; faces = $faces }
    $render = Read-Request
    Render $bitmap @($render.regions) $request.style $render.output
    Write-Response @{ done = $true }
  } finally { $bitmap.Dispose() }
}

function Invoke-Copy($request) {
  try { $bytes = [System.IO.File]::ReadAllBytes($request.outputPath); $bitmap = Read-BitmapBytes $bytes }
  catch { throw 'Could not read the redacted image. Scan the current clipboard again.' }
  try {
    if ($null -ne $request.expectedChangeCount -and (Get-ClipboardSequence) -ne [uint32]$request.expectedChangeCount) { throw $Changed }
    $data = New-Object System.Windows.Forms.DataObject
    $data.SetData('PNG', $false, (New-Object System.IO.MemoryStream (, $bytes)))
    $data.SetData([System.Windows.Forms.DataFormats]::Bitmap, $true, $bitmap)
    try { [System.Windows.Forms.Clipboard]::SetDataObject($data, $true, 10, 100) }
    catch { throw 'Could not copy the redacted image. Try copying it again.' }
    Write-Response @{ done = $true }
  } finally { $bitmap.Dispose() }
}

try {
  $request = Read-Request
  switch ($request.operation) {
    'scan' { Invoke-Scan $request }
    'copy' { Invoke-Copy $request }
    'changeCount' { Write-Response @{ changeCount = (Get-ClipboardSequence) } }
    default { throw 'Unknown operation.' }
  }
  exit 0
} catch {
  [Console]::Error.WriteLine((Get-Innermost $_.Exception).Message)
  exit 1
}
