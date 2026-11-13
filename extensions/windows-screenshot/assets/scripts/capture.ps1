[CmdletBinding()]
param (
    [string]$Mode = "region",
    [string]$SavePath = "",
    [switch]$CopyToClipboard,
    [int]$DelayMs = 0,
    [string]$ShowMagnifier = "true"
)

$dllPath = Join-Path $PSScriptRoot "..\bin\CaptureEngine.dll"

$dllLoaded = $false
if (Test-Path $dllPath) {
    try {
        $bytes = [System.IO.File]::ReadAllBytes([System.IO.Path]::GetFullPath($dllPath))
        [System.Reflection.Assembly]::Load($bytes) | Out-Null
        $dllLoaded = $true
    } catch {}
}

if (-not $dllLoaded) {
    $csPath = Join-Path $PSScriptRoot "capture.cs"
    if (Test-Path $csPath) {
        $csSource = Get-Content -Raw -Path $csPath
        Add-Type -TypeDefinition $csSource -ReferencedAssemblies System.Windows.Forms, System.Drawing, System.dll
    } else {
        Write-Error "Neither CaptureEngine.dll nor capture.cs could be located."
        exit 1
    }
}

$passArgs = @("-Mode", $Mode)
if ($SavePath -ne "") {
    $passArgs += @("-SavePath", $SavePath)
}
if ($CopyToClipboard) {
    $passArgs += @("-CopyToClipboard")
}
if ($DelayMs -gt 0) {
    $passArgs += @("-DelayMs", "$DelayMs")
}
$passArgs += @("-ShowMagnifier", $ShowMagnifier)

[Program]::Main([string[]]$passArgs)
