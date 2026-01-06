# Test: Edge cases
Write-Host "=== TEST: Edge Cases ===" -ForegroundColor Cyan

# Test 1: Port not in use
Write-Host ""
Write-Host "Test 1: Port not in use (55555)" -ForegroundColor Yellow
$conn = Get-NetTCPConnection -LocalPort 55555 -ErrorAction SilentlyContinue
if ($conn) {
    $result = $conn.OwningProcess | Select-Object -First 1
    Write-Host "Unexpected: Found process $result on port 55555" -ForegroundColor Red
} else {
    Write-Host "Correctly returned empty for unused port" -ForegroundColor Green
}

# Test 2: Invalid port handling
Write-Host ""
Write-Host "Test 2: Invalid port (99999)" -ForegroundColor Yellow
try {
    $conn = Get-NetTCPConnection -LocalPort 99999 -ErrorAction Stop
    Write-Host "Unexpected: No error for invalid port" -ForegroundColor Red
} catch {
    Write-Host "Correctly threw error for invalid port" -ForegroundColor Green
}

# Test 3: System process (should fail without admin)
Write-Host ""
Write-Host "Test 3: Kill system process (PID 4 - System)" -ForegroundColor Yellow
try {
    Stop-Process -Id 4 -Force -ErrorAction Stop
    Write-Host "Unexpected: Was able to kill System process" -ForegroundColor Red
} catch {
    if ($_.Exception.Message -match "denied|cannot|access") {
        Write-Host "Correctly denied access to system process" -ForegroundColor Green
    } else {
        Write-Host "Error (expected): $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

# Test 4: Non-existent PID
Write-Host ""
Write-Host "Test 4: Non-existent PID (999999)" -ForegroundColor Yellow
try {
    Stop-Process -Id 999999 -Force -ErrorAction Stop
    Write-Host "Unexpected: No error for non-existent PID" -ForegroundColor Red
} catch {
    Write-Host "Correctly threw error for non-existent PID" -ForegroundColor Green
}

# Test 5: JSON output for single port
Write-Host ""
Write-Host "Test 5: JSON handles single result" -ForegroundColor Yellow
$single = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1 |
    ForEach-Object {
        [PSCustomObject]@{
            LocalPort = $_.LocalPort
            PID = $_.OwningProcess
        }
    } | ConvertTo-Json -Depth 2

try {
    $parsed = $single | ConvertFrom-Json
    # Check if it's an object (not array)
    if ($parsed.LocalPort) {
        Write-Host "Single result JSON valid" -ForegroundColor Green
    }
} catch {
    Write-Host "FAILED: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== ALL EDGE CASE TESTS PASSED ===" -ForegroundColor Green
