#requires -Version 5.1
# Watch-Aria2.ps1
# Hidden completion/error watcher and optional idle shutdown for aria2.
#
# aria2 1.37.0 x64 on Windows can fail CreateProcess() for configured event
# hooks, so the engine uses this small polling process as the reliable
# notification path. It starts with the daemon, survives the Raycast extension
# being closed, and exits a few seconds after the RPC endpoint disappears.
#
# When autoStopWhenIdle is enabled, the watcher shuts the daemon down after all
# downloads have finished. The shutdown is delayed by two polls so a follow-up
# Add Download has a chance to arrive first.
#
# Dedupe markers are shared with Notify-Aria2.ps1: if an aria2 hook ever does
# fire successfully, the watcher skips that GID.

[CmdletBinding()]
param(
    [int]$IntervalSeconds = 3,
    [switch]$NoToast,
    [switch]$Once,
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
    if (Test-Path -LiteralPath $paths.SettingsFile -PathType Leaf) {
        try {
            $settings = Read-Aria2Settings -Path $paths.SettingsFile
        } catch {
            $settings = $null
        }
    }
    if ($null -eq $settings) {
        $settings = Get-Aria2DefaultSettings
    }

    $notificationsEnabled = [bool]$settings['notifications']
    $autoStopWhenIdle = [bool]$settings['autoStopWhenIdle']
    if (-not $notificationsEnabled -and -not $autoStopWhenIdle) {
        exit $exitCodes.Success
    }

    $port = [int]$settings['rpcPort']
    if ($DryRun) {
        Write-Output ('watch script: ' + $paths.WatchScript)
        Write-Output ('rpc: http://127.0.0.1:' + $port + '/jsonrpc')
        Write-Output ('interval: ' + [string]$IntervalSeconds + 's')
        Write-Output ('notifications: ' + (Format-Aria2Boolean -Value $notificationsEnabled))
        Write-Output ('auto stop when idle: ' + (Format-Aria2Boolean -Value $autoStopWhenIdle))
        Write-Output 'dry run: no RPC calls and no notifications'
        exit $exitCodes.Success
    }

    $secret = ''
    if (Test-Path -LiteralPath $paths.SecretFile -PathType Leaf) {
        try {
            $secret = Get-Aria2Secret -Path $paths.SecretFile
        } catch {
            $secret = ''
        }
    }
    if ([string]::IsNullOrEmpty($secret)) {
        Write-Aria2EngineLog -Paths $paths -Message 'watch: no RPC secret; exiting' -Level 'ERROR'
        exit $exitCodes.RpcFailure
    }

    $interval = [Math]::Max(1, $IntervalSeconds)
    $consecutiveFailures = 0
    $baseline = $false
    $notifiedThisRun = @{}
    $hadCompletion = $false
    $idlePolls = 0

    while ($true) {
        if (-not (Test-Aria2RpcAvailable -Port $port -Secret $secret -TimeoutMs 1200)) {
            $consecutiveFailures = $consecutiveFailures + 1
            if ($consecutiveFailures -ge 3) {
                Write-Aria2EngineLog -Paths $paths -Message 'watch: RPC unavailable; exiting'
                exit $exitCodes.Success
            }
            Start-Sleep -Seconds $interval
            continue
        }
        $consecutiveFailures = 0

        $stopped = @()
        try {
            $stopped = @(Invoke-Aria2Rpc -Port $port -Secret $secret -Method 'aria2.tellStopped' -Parameters @(0, 200) -TimeoutMs 4000)
        } catch {
            $stopped = @()
        }

        foreach ($task in $stopped) {
            $gid = Get-Aria2StatusString -Status $task -Name 'gid'
            $status = Get-Aria2StatusString -Status $task -Name 'status'
            if ([string]::IsNullOrWhiteSpace($gid) -or $status -eq 'removed') {
                continue
            }
            if ($status -ne 'complete' -and $status -ne 'error') {
                continue
            }
            $marker = Get-Aria2NotifiedMarker -Paths $paths -Gid $gid
            if ($null -ne $marker) {
                continue
            }
            if ($notifiedThisRun.ContainsKey($gid.ToLowerInvariant())) {
                continue
            }
            $notifiedThisRun[$gid.ToLowerInvariant()] = $true

            if (-not $baseline) {
                # Existing stopped tasks are history; suppress them on startup.
                try {
                    $null = Set-Aria2Notified -Paths $paths -Gid $gid -EventName 'baseline'
                } catch {
                }
                continue
            }

            $followedBy = @($task.followedBy | Where-Object { -not [string]::IsNullOrWhiteSpace([string]$_) })
            if ($followedBy.Count -gt 0) {
                # Magnet metadata completion is followed by the actual torrent
                # task. Do not notify or auto-stop on the metadata artifact.
                try {
                    $null = Set-Aria2Notified -Paths $paths -Gid $gid -EventName 'metadata'
                } catch {
                }
                Write-Aria2EngineLog -Paths $paths -Message ('watch: metadata complete; waiting for followed task gid=' + $gid + ' followedBy=' + ($followedBy -join ','))
                continue
            }

            $name = Get-Aria2TaskName -Status $task
            $sizeText = Format-Aria2ByteSize -Bytes (Get-Aria2StatusNumber -Status $task -Name 'totalLength')
            $body = $name
            if (-not [string]::IsNullOrWhiteSpace($sizeText)) {
                $body = $body + ' (' + $sizeText + ')'
            }
            if ($status -eq 'error') {
                $title = 'Download failed'
                $errorMessage = Get-Aria2StatusString -Status $task -Name 'errorMessage'
                $errorCode = Get-Aria2StatusString -Status $task -Name 'errorCode'
                if (-not [string]::IsNullOrWhiteSpace($errorMessage)) {
                    $body = $body + ' - ' + $errorMessage
                } elseif (-not [string]::IsNullOrWhiteSpace($errorCode)) {
                    $body = $body + ' - aria2 error code ' + $errorCode
                } else {
                    $body = $body + ' - download failed'
                }
            } else {
                $title = 'Download complete'
                $body = $body + ' - download complete'
            }

            if ($notificationsEnabled) {
                $null = Show-Aria2ToastIfEnabled -NoToast:$NoToast -Title $title -Message $body
            }
            try {
                $null = Set-Aria2Notified -Paths $paths -Gid $gid -EventName 'watcher'
            } catch {
            }
            $hadCompletion = $true
            Write-Aria2EngineLog -Paths $paths -Message ('watch: notified gid=' + $gid + ' status=' + $status)
        }

        if (-not $baseline) {
            $baseline = $true
            Write-Aria2EngineLog -Paths $paths -Message 'watch: baseline initialized'
        }

        if ($autoStopWhenIdle -and $hadCompletion) {
            $activeCount = 0
            $waitingCount = 0
            $statsAvailable = $false
            try {
                $stat = Invoke-Aria2Rpc -Port $port -Secret $secret -Method 'aria2.getGlobalStat' -TimeoutMs 3000
                $activeCount = [int]$stat['numActive']
                $waitingCount = [int]$stat['numWaiting']
                $statsAvailable = $true
            } catch {
                $statsAvailable = $false
            }

            if ($statsAvailable -and ($activeCount + $waitingCount) -eq 0) {
                $idlePolls = $idlePolls + 1
                if ($idlePolls -ge 4) {
                    Write-Aria2EngineLog -Paths $paths -Message 'watch: all downloads finished; shutting aria2 down'
                    try {
                        $null = Invoke-Aria2Rpc -Port $port -Secret $secret -Method 'aria2.shutdown' -TimeoutMs 3000
                    } catch {
                        # A successful shutdown often closes the connection before replying.
                    }
                    $null = Wait-Aria2RpcDown -Port $port -Secret $secret -TimeoutSeconds 10
                    exit $exitCodes.Success
                }
            } else {
                $idlePolls = 0
            }
        }

        if ($Once) {
            exit $exitCodes.Success
        }
        Start-Sleep -Seconds $interval
    }
} catch {
    if ($null -ne $paths) {
        Write-Aria2EngineLog -Paths $paths -Message ('watch failed: ' + (Get-Aria2ErrorMessage -ErrorRecord $_)) -Level 'ERROR'
    }
    exit $exitCodes.RpcFailure
} finally {
    if ($null -ne $paths) {
        Remove-Item -LiteralPath $Paths.WatchPidFile -Force -ErrorAction SilentlyContinue
    }
}
