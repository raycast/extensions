[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " Building Windows Screenshot Native Binaries" -ForegroundColor Cyan
Write-Host "=========================================`n" -ForegroundColor Cyan

# 1. Locate Microsoft C# Compiler (csc.exe)
$cscPath = $null
if (Get-Command "csc.exe" -ErrorAction SilentlyContinue) {
    $cscPath = (Get-Command "csc.exe").Source
} else {
    $candidates = @(
        "$env:SystemRoot\Microsoft.NET\Framework64\v4.0.30319\csc.exe",
        "$env:SystemRoot\Microsoft.NET\Framework\v4.0.30319\csc.exe"
    )
    foreach ($cand in $candidates) {
        if (Test-Path $cand) {
            $cscPath = $cand
            break
        }
    }
}

if (-not $cscPath) {
    Write-Error "Microsoft C# Compiler (csc.exe) not found in PATH or standard .NET Framework directory."
    exit 1
}

Write-Host "[1/4] Found C# Compiler: $cscPath" -ForegroundColor Green

# 2. Prepare output directory
$scriptDir = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $scriptDir "..\..")).Path
$binDir = Join-Path $repoRoot "assets\bin"

if (-not (Test-Path $binDir)) {
    New-Item -ItemType Directory -Path $binDir -Force | Out-Null
}

# 3. Compile CaptureEngine.dll from capture.cs
$captureSrc = Join-Path $scriptDir "capture.cs"
$captureDll = Join-Path $binDir "CaptureEngine.dll"

if (-not (Test-Path $captureSrc)) {
    Write-Error "Source file not found: $captureSrc"
    exit 1
}

Write-Host "[2/4] Compiling CaptureEngine.dll from assets\scripts\capture.cs..." -ForegroundColor Yellow
$captureArgs = @(
    "/target:library",
    "/optimize+",
    "/platform:anycpu",
    "/out:$captureDll",
    "/r:System.dll,System.Windows.Forms.dll,System.Drawing.dll",
    "$captureSrc"
)

& $cscPath $captureArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to compile CaptureEngine.dll"
    exit $LASTEXITCODE
}
Write-Host "      [OK] Successfully built $captureDll" -ForegroundColor Green

# 4. Compile ocr.exe from ocr.cs
$ocrSrc = Join-Path $scriptDir "ocr.cs"
$ocrExe = Join-Path $binDir "ocr.exe"

if (-not (Test-Path $ocrSrc)) {
    Write-Error "Source file not found: $ocrSrc"
    exit 1
}

Write-Host "[3/4] Compiling ocr.exe from assets\scripts\ocr.cs..." -ForegroundColor Yellow
$frameworkDir = Split-Path $cscPath
$ocrRefs = @()

$sysRuntime = Join-Path $frameworkDir "System.Runtime.dll"
if (Test-Path $sysRuntime) { $ocrRefs += "/r:`"$sysRuntime`"" }

$sysWinRt = Join-Path $frameworkDir "System.Runtime.WindowsRuntime.dll"
if (Test-Path $sysWinRt) { $ocrRefs += "/r:`"$sysWinRt`"" }

$winMetadataDir = "$env:SystemRoot\System32\WinMetadata"
if (Test-Path $winMetadataDir) {
    Get-ChildItem -Path $winMetadataDir -Filter "*.winmd" | ForEach-Object {
        $ocrRefs += "/r:`"$($_.FullName)`""
    }
}

$ocrArgs = @(
    "/target:exe",
    "/optimize+",
    "/platform:anycpu",
    "/out:$ocrExe"
) + $ocrRefs + @("$ocrSrc")

& $cscPath $ocrArgs
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to compile ocr.exe"
    exit $LASTEXITCODE
}
Write-Host "      [OK] Successfully built $ocrExe" -ForegroundColor Green

# 5. Output Verification & SHA-256 Checksums
Write-Host "`n[4/4] Verification & Checksums:" -ForegroundColor Cyan
$hashes = Get-FileHash -Algorithm SHA256 @($captureDll, $ocrExe)
$hashes | Format-Table -AutoSize

Write-Host "Build complete! All native binaries successfully compiled from source." -ForegroundColor Green
exit 0
