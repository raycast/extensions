# Test: Kill port with existing Node server
param([int]$Port = 9998)

Write-Host "=== TEST: Kill Port ($Port) ===" -ForegroundColor Cyan

# Check if port is in use
Write-Host "Step 1: Check if port $Port is in use..." -ForegroundColor Yellow
$conn = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if (-not $conn) {
    Write-Host "SKIP: No process on port $Port" -ForegroundColor Yellow
    exit 0
}

$targetPid = $conn.OwningProcess | Select-Object -First 1
$proc = Get-Process -Id $targetPid -ErrorAction SilentlyContinue
Write-Host "Found: $($proc.ProcessName) (PID: $targetPid)" -ForegroundColor Green

# Kill process
Write-Host ""
Write-Host "Step 2: Killing process..." -ForegroundColor Yellow
try {
    Stop-Process -Id $targetPid -Force -ErrorAction Stop
    Write-Host "Process killed" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
    exit 1
}

# Verify
Start-Sleep -Milliseconds 500
Write-Host ""
Write-Host "Step 3: Verifying port is free..." -ForegroundColor Yellow
$conn2 = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($conn2) {
    Write-Host "FAILED: Port still in use" -ForegroundColor Red
    exit 1
}

Write-Host "Port $Port is now free" -ForegroundColor Green
Write-Host ""
Write-Host "=== TEST PASSED ===" -ForegroundColor Green
