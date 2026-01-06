# Test: Kill port functionality
param(
    [int]$TestPort = 9998
)

Write-Host "=== TEST: Kill Port ===" -ForegroundColor Cyan

# Step 1: Start a test server
Write-Host "Starting test server on port $TestPort..." -ForegroundColor Yellow
$job = Start-Job -ScriptBlock {
    param($port)
    $listener = [System.Net.HttpListener]::new()
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $response = $context.Response
        $response.StatusCode = 200
        $response.Close()
    }
} -ArgumentList $TestPort

Start-Sleep -Seconds 2

# Step 2: Verify server is running
Write-Host "Checking if port $TestPort is in use..." -ForegroundColor Yellow
$conn = Get-NetTCPConnection -LocalPort $TestPort -ErrorAction SilentlyContinue
if (-not $conn) {
    Write-Host "FAILED: Server did not start on port $TestPort" -ForegroundColor Red
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -ErrorAction SilentlyContinue
    exit 1
}

$pid = $conn.OwningProcess | Select-Object -First 1
Write-Host "Server running with PID: $pid" -ForegroundColor Green

# Step 3: Kill the process
Write-Host "Killing process on port $TestPort..." -ForegroundColor Yellow
try {
    Stop-Process -Id $pid -Force -ErrorAction Stop
    Write-Host "Process killed successfully" -ForegroundColor Green
} catch {
    Write-Host "FAILED to kill: $_" -ForegroundColor Red
    Stop-Job $job -ErrorAction SilentlyContinue
    Remove-Job $job -ErrorAction SilentlyContinue
    exit 1
}

# Step 4: Verify port is free
Start-Sleep -Seconds 1
$conn2 = Get-NetTCPConnection -LocalPort $TestPort -ErrorAction SilentlyContinue
if ($conn2) {
    Write-Host "FAILED: Port $TestPort still in use" -ForegroundColor Red
    exit 1
}

Write-Host "Port $TestPort is now free" -ForegroundColor Green

# Cleanup
Stop-Job $job -ErrorAction SilentlyContinue
Remove-Job $job -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "=== TEST PASSED ===" -ForegroundColor Green
