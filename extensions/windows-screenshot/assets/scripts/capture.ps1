[CmdletBinding()]
param (
    [string]$Mode = "region",
    [string]$SavePath = "",
    [switch]$CopyToClipboard,
    [int]$DelayMs = 0,
    [string]$ShowMagnifier = "true"
)

$dllCandidate1 = Join-Path $PSScriptRoot "..\bin\CaptureEngine.dll"
$dllCandidate2 = "C:\Coding\MyProjects\Raycast Screenshot Extention\assets\bin\CaptureEngine.dll"

$dllLoaded = $false
foreach ($dll in @($dllCandidate1, $dllCandidate2)) {
    if (Test-Path $dll) {
        try {
            $bytes = [System.IO.File]::ReadAllBytes([System.IO.Path]::GetFullPath($dll))
            [System.Reflection.Assembly]::Load($bytes) | Out-Null
            $dllLoaded = $true
            break
        } catch {}
    }
}

if (-not $dllLoaded) {
    $csPath = Join-Path $PSScriptRoot "capture.cs"
    if (-not (Test-Path $csPath)) {
        $csPath = "C:\Coding\MyProjects\Raycast Screenshot Extention\assets\scripts\capture.cs"
    }
    $csSource = Get-Content -Raw -Path $csPath
    Add-Type -TypeDefinition $csSource -ReferencedAssemblies System.Windows.Forms, System.Drawing, System.dll
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
