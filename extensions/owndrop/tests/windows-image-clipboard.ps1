param([switch]$Integration)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$helper = Get-Content -Raw -Encoding utf8 (Join-Path $PSScriptRoot '../assets/copy-image-windows.ps1')
$writeCall = '[System.Windows.Forms.Clipboard]::SetDataObject($data, $true, 10, 100)'
if (-not $helper.Contains($writeCall)) { throw 'Clipboard helper contract changed; review this test.' }

# Default tests inspect the payload without replacing the user's clipboard.
$assertions = @'
if (-not $data.GetDataPresent('PNG', $false)) { throw 'PNG format missing' }
if (-not $data.GetDataPresent([System.Windows.Forms.DataFormats]::Bitmap)) { throw 'Bitmap format missing' }
if ($data.GetDataPresent([System.Windows.Forms.DataFormats]::FileDrop)) { throw 'Unexpected file reference' }
$decoded = [Drawing.Image]::FromStream($data.GetData('PNG', $false))
try {
    if ($decoded.Width -ne 3 -or $decoded.Height -ne 2) { throw 'Wrong pixel dimensions' }
    if ($env:OWNDROP_TEST_ALPHA -eq 'yes' -and $decoded.GetPixel(0, 0).A -ne 64) { throw 'PNG transparency lost' }
} finally { $decoded.Dispose() }
'@
$payloadTest = $helper.Replace($writeCall, $assertions)
if ($payloadTest.Contains('::SetDataObject(')) { throw 'Payload test must not modify the clipboard' }

$directory = Join-Path ([IO.Path]::GetTempPath()) ('owndrop-clipboard-test-' + [guid]::NewGuid().ToString())
[IO.Directory]::CreateDirectory($directory) | Out-Null
$formats = @{
    'png' = [Drawing.Imaging.ImageFormat]::Png
    'jpg' = [Drawing.Imaging.ImageFormat]::Jpeg
    'bmp' = [Drawing.Imaging.ImageFormat]::Bmp
    'gif' = [Drawing.Imaging.ImageFormat]::Gif
    'tiff' = [Drawing.Imaging.ImageFormat]::Tiff
}
foreach ($extension in $formats.Keys) {
    $fixture = Join-Path $directory ("image's test." + $extension)
    $bitmap = New-Object Drawing.Bitmap(3, 2)
    try {
        $bitmap.SetPixel(0, 0, [Drawing.Color]::FromArgb(64, 240, 32, 16))
        $bitmap.Save($fixture, $formats[$extension])
    } finally { $bitmap.Dispose() }
    $env:OWNDROP_CLIPBOARD_IMAGE_PATH = $fixture
    $env:OWNDROP_TEST_ALPHA = if ($extension -eq 'png') { 'yes' } else { 'no' }
    & ([scriptblock]::Create($payloadTest))
}
Write-Output 'PASS: PNG/JPEG/BMP/GIF/TIFF payloads, PNG transparency, no FileDrop'

if (-not $Integration) { return }

# Opt-in real clipboard test: materialize and restore existing formats without logging them.
$snapshot = [System.Windows.Forms.Clipboard]::GetDataObject()
$backup = New-Object System.Windows.Forms.DataObject
$resources = New-Object System.Collections.Generic.List[System.IDisposable]
if ($snapshot) {
    foreach ($format in $snapshot.GetFormats($false)) {
        $value = $snapshot.GetData($format, $false)
        if ($value -is [IO.Stream]) {
            $copy = New-Object IO.MemoryStream
            if ($value.CanSeek) { $value.Position = 0 }
            $value.CopyTo($copy)
            $copy.Position = 0
            $resources.Add($copy)
            $value = $copy
        } elseif ($value -is [Drawing.Image]) {
            $value = $value.Clone()
            $resources.Add($value)
        }
        if ($null -ne $value) { $backup.SetData($format, $false, $value) }
    }
}
try {
    $env:OWNDROP_CLIPBOARD_IMAGE_PATH = Join-Path $directory "image's test.png"
    & "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -STA -Command $helper
    if ($LASTEXITCODE -ne 0) { throw 'Clipboard helper failed' }
    $data = [System.Windows.Forms.Clipboard]::GetDataObject()
    $env:OWNDROP_TEST_ALPHA = 'yes'
    & ([scriptblock]::Create($assertions))
    Write-Output 'PASS: image pixels persist after helper exit; original clipboard restored afterward'
} finally {
    if ($snapshot) {
        [System.Windows.Forms.Clipboard]::SetDataObject($backup, $true, 10, 100)
    } else {
        [System.Windows.Forms.Clipboard]::Clear()
    }
    foreach ($resource in $resources) { $resource.Dispose() }
}
