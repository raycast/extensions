$ports = @()
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Select-Object LocalPort, OwningProcess -Unique |
  Sort-Object LocalPort |
  ForEach-Object {
    $proc = Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue
    $ports += [PSCustomObject]@{
      LocalPort = $_.LocalPort
      PID = $_.OwningProcess
      ProcessName = if ($proc) { $proc.ProcessName } else { "Unknown" }
      State = "Listen"
    }
  }
$ports | ConvertTo-Json -Depth 2 -Compress
