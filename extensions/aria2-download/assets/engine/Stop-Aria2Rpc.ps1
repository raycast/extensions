#requires -Version 5.1
# Stop-Aria2Rpc.ps1
# Stops the aria2 RPC process started by Start-Aria2Rpc.ps1.
#
# Idle-only by default (the documented invocation passes -OnlyIfIdle): if there
# are active or waiting downloads the script refuses with exit code 5 unless
# -Force is given. Stopping escalates gracefully: aria2.shutdown, then
# aria2.forceShutdown, then a process kill of our own aria2c instance.

[CmdletBinding()]
param(
    [switch]$OnlyIfIdle,
    [switch]$Force,
    [switch]$NoToast,
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
$engineRoot = $PSScriptRoot
. (Join-Path $engineRoot 'Aria2Common.ps1')
Initialize-Aria2Console

$exitCodes = $script:Aria2ExitCodes
$paths = $null
try {
    $paths = Get-Aria2StatePaths -Root (Get-Aria2StateRoot)

    $settings = $null
    try {
        if (Test-Path -LiteralPath $paths.SettingsFile -PathType Leaf) {
            $settings = Read-Aria2Settings -Path $paths.SettingsFile
        }
    } catch {
        throw (New-Aria2Error $_.Exception.Message $exitCodes.InvalidInput)
    }
    if ($null -eq $settings) {
        $settings = Get-Aria2DefaultSettings
    }
    $validation = Test-Aria2Settings -Settings $settings
    if (-not $validation.IsValid) {
        throw (New-Aria2Error ('Invalid settings: ' + ($validation.Errors -join '; ')) $exitCodes.InvalidInput)
    }

    $port = [int]$settings['rpcPort']
    $secret = ''
    if (Test-Path -LiteralPath $paths.SecretFile -PathType Leaf) {
        try {
            $secret = Get-Aria2Secret -Path $paths.SecretFile
        } catch {
            Write-Aria2ErrorLine ('Warning: ' + $_.Exception.Message)
            $secret = ''
        }
    }

    $rpcUp = $false
    if (-not [string]::IsNullOrEmpty($secret)) {
        $rpcUp = Test-Aria2RpcAvailable -Port $port -Secret $secret -TimeoutMs 1500
    }
    $running = Get-Aria2RunningProcessIds -Paths $paths

    $activeCount = 0
    $waitingCount = 0
    if ($rpcUp) {
        try {
            $activeCount = @(Invoke-Aria2Rpc -Port $port -Secret $secret -Method 'aria2.tellActive' -TimeoutMs 3000).Count
        } catch {
            $activeCount = 0
        }
        try {
            $waitingCount = @(Invoke-Aria2Rpc -Port $port -Secret $secret -Method 'aria2.tellWaiting' -Parameters @(0, 1000) -TimeoutMs 3000).Count
        } catch {
            $waitingCount = 0
        }
    }
    $busy = ($activeCount + $waitingCount) -gt 0

    if ($DryRun) {
        if ($rpcUp) {
            Write-Output 'rpc: running'
        } else {
            Write-Output 'rpc: not running'
        }
        Write-Output ('aria2c processes: ' + $running.Count)
        Write-Output ('active downloads: ' + $activeCount)
        Write-Output ('waiting downloads: ' + $waitingCount)
        $watcherId = Get-Aria2WatcherProcessId -Paths $paths
        if ($watcherId -gt 0) {
            Write-Output ('watcher pid: ' + $watcherId)
        } else {
            Write-Output 'watcher: not running'
        }
        if ($rpcUp -and $busy -and -not $Force) {
            Write-Output 'decision: would refuse because downloads are active (exit 5 without -Force)'
        } elseif ($rpcUp -or $running.Count -gt 0) {
            Write-Output 'decision: would stop aria2'
        } else {
            Write-Output 'decision: nothing to stop'
        }
        exit $exitCodes.Success
    }

    if (-not $rpcUp -and $running.Count -eq 0) {
        Write-Output 'aria2 is not running.'
        Write-Aria2EngineLog -Paths $paths -Message 'stop: not running' -Secret $secret
        exit $exitCodes.Success
    }

    if (-not $rpcUp) {
        if (-not $Force) {
            throw (New-Aria2Error ('aria2c is running (pid ' + ($running.Ids -join ', ') + ') but its RPC endpoint is not responding. Use -Force to stop it.') $exitCodes.RpcFailure)
        }
        Write-Aria2EngineLog -Paths $paths -Message ('stop: rpc unreachable, forcing process stop for pid ' + ($running.Ids -join ',')) -Secret $secret
    } elseif ($busy -and -not $Force) {
        $busyMessage = 'aria2 has ' + $activeCount + ' active and ' + $waitingCount + ' waiting download(s); refusing to stop. Use -Force to stop anyway.'
        Write-Aria2ErrorLine $busyMessage
        Write-Aria2EngineLog -Paths $paths -Message ('stop: refused, active=' + $activeCount + ' waiting=' + $waitingCount) -Secret $secret
        $busyDetail = [string]$activeCount + ' active, ' + [string]$waitingCount + ' waiting downloads.'
        $null = Show-Aria2ToastIfEnabled -NoToast:$NoToast -Title 'aria2 is busy' -Message $busyDetail
        exit $exitCodes.Busy
    }

    Stop-Aria2Watcher -Paths $paths

    if ($rpcUp) {
        if ($busy) {
            Write-Aria2EngineLog -Paths $paths -Message ('stop: forcing stop with active=' + $activeCount + ' waiting=' + $waitingCount) -Secret $secret
        }
        try {
            $null = Invoke-Aria2Rpc -Port $port -Secret $secret -Method 'aria2.shutdown' -TimeoutMs 3000
        } catch {
            # A successful shutdown often closes the connection before replying.
            Write-Aria2EngineLog -Paths $paths -Message ('stop: aria2.shutdown returned without a clean reply') -Secret $secret
        }
        $stopped = Wait-Aria2RpcDown -Port $port -Secret $secret -TimeoutSeconds 20
        if (-not $stopped) {
            try {
                $null = Invoke-Aria2Rpc -Port $port -Secret $secret -Method 'aria2.forceShutdown' -TimeoutMs 3000
            } catch {
            }
            $null = Wait-Aria2RpcDown -Port $port -Secret $secret -TimeoutSeconds 8
        }
    }

    $running = Get-Aria2RunningProcessIds -Paths $paths
    if ($running.Count -gt 0) {
        foreach ($processId in $running.Ids) {
            $null = Stop-Aria2ProcessById -ProcessId $processId
        }
        Start-Sleep -Milliseconds 500
        $running = Get-Aria2RunningProcessIds -Paths $paths
    }
    if ($running.Count -gt 0) {
        throw (New-Aria2Error ('Failed to stop aria2c process(es): ' + ($running.Ids -join ', ')) $exitCodes.RpcFailure)
    }

    Write-Output 'aria2 stopped.'
    Write-Aria2EngineLog -Paths $paths -Message 'stop: ok' -Secret $secret
    $null = Show-Aria2ToastIfEnabled -NoToast:$NoToast -Title 'aria2 stopped' -Message 'The aria2 RPC engine has stopped.'
    exit $exitCodes.Success
} catch {
    $code = Get-Aria2ErrorExitCode -ErrorRecord $_ -DefaultCode $exitCodes.RpcFailure
    $message = Get-Aria2ErrorMessage -ErrorRecord $_
    Write-Aria2ErrorLine $message
    if ($null -ne $paths) {
        Write-Aria2EngineLog -Paths $paths -Message ('stop failed: ' + $message) -Level 'ERROR'
    }
    exit $code
}
