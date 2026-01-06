# Test: List all listening ports
Write-Host "=== TEST: List Ports ===" -ForegroundColor Cyan

$result = Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalPort, OwningProcess |
  Sort-Object LocalPort |
  Get-Unique -AsString |
  ForEach-Object {
    $p = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    [PSCustomObject]@{
      LocalPort = $_.LocalPort
      PID = $_.OwningProcess
      ProcessName = $p.ProcessName
      State = "Listen"
    }
  }

$json = $result | ConvertTo-Json -Depth 2
$count = ($result | Measure-Object).Count

Write-Host "Found $count listening ports" -ForegroundColor Green
Write-Host ""
Write-Host "Sample output (first 5):"
$result | Select-Object -First 5 | Format-Table -AutoSize

Write-Host ""
Write-Host "JSON parsing test:" -ForegroundColor Yellow
try {
    $parsed = $json | ConvertFrom-Json
    Write-Host "JSON valid - $($parsed.Count) items parsed" -ForegroundColor Green
} catch {
    Write-Host "JSON INVALID: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=== TEST PASSED ===" -ForegroundColor Green
