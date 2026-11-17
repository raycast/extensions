#requires -Version 5.1
# Start-Aria2Rpc.ps1
# Starts aria2 in JSON-RPC mode as a hidden child process.
#
# Windows has no usable aria2 daemon mode (--daemon is unsupported), so the
# engine always starts aria2c with Start-Process -WindowStyle Hidden and leaves
# lifecycle management to the explicit Start/Stop engine scripts.
#
# Idempotent: if the RPC endpoint already responds, the script exits 0.

[CmdletBinding()]
param(
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
    $settingsCreated = $false
    if ($null -eq $settings) {
        $settings = Get-Aria2DefaultSettings
        $settingsCreated = $true
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
            throw (New-Aria2Error $_.Exception.Message $exitCodes.InvalidInput)
        }
    }

    $exePath = Find-Aria2ExistingExe -Paths $paths
    if ($null -eq $exePath) {
        throw (New-Aria2Error 'aria2c.exe is not installed. Install aria2 and try again.' $exitCodes.Aria2Missing)
    }
    $arguments = Get-Aria2StartArguments -Paths $paths -Settings $settings

    if ($DryRun) {
        Write-Output ('aria2c: ' + $exePath)
        Write-Output ('working directory: ' + $paths.Root)
        Write-Output ('arguments: ' + $arguments)
        Write-Output ('rpc endpoint: http://127.0.0.1:' + $port + '/jsonrpc')
        Write-Output ('proxy mode: ' + [string]$settings['proxyMode'])
        Write-Output ('runtime conf: ' + $paths.RuntimeConfFile)
        Write-Output ('secret file: ' + $paths.SecretFile + ' (value never printed)')
        Write-Output ('watcher: ' + $paths.WatchScript)
        exit $exitCodes.Success
    }

    $null = Initialize-Aria2StateLayout -Paths $paths
    if ($settingsCreated) {
        Save-Aria2Settings -Path $paths.SettingsFile -Settings $settings
    }
    $secret = Initialize-Aria2SecretFile -Paths $paths
    $null = New-Aria2RuntimeConf -Settings $settings -Secret $secret -Paths $paths

    if (Test-Aria2RpcAvailable -Port $port -Secret $secret -TimeoutMs 1500) {
        Write-Output ('aria2 RPC is already running on http://127.0.0.1:' + $port + '/jsonrpc.')
        Write-Aria2EngineLog -Paths $paths -Message ('start: already running on port ' + $port) -Secret $secret
        $null = Start-Aria2Watcher -Paths $paths
        exit $exitCodes.Success
    }

    $running = Get-Aria2RunningProcessIds -Paths $paths
    if ($running.Count -gt 0) {
        # Another start may still be coming up; give it a short grace period
        # before declaring the existing process unhealthy.
        if (Wait-Aria2RpcReady -Port $port -Secret $secret -TimeoutSeconds 8) {
            Write-Output ('aria2 RPC is already running on http://127.0.0.1:' + $port + '/jsonrpc.')
            Write-Aria2EngineLog -Paths $paths -Message ('start: already running on port ' + $port) -Secret $secret
            $null = Start-Aria2Watcher -Paths $paths
            exit $exitCodes.Success
        }
        throw (New-Aria2Error 'aria2c is running with this engine configuration but its RPC endpoint is not responding. Run Stop-Aria2Rpc.ps1 -Force, then try again.' $exitCodes.RpcFailure)
    }

    Write-Output ('starting aria2c: ' + $exePath)
    $process = Start-Process -FilePath $exePath -ArgumentList $arguments -WorkingDirectory $paths.Root -WindowStyle Hidden -PassThru -ErrorAction Stop

    if (-not (Wait-Aria2RpcReady -Port $port -Secret $secret -TimeoutSeconds 20 -Process $process)) {
        $detail = 'aria2c did not become ready on http://127.0.0.1:' + $port + '/jsonrpc'
        try {
            if ($null -ne $process -and $process.HasExited) {
                $detail = $detail + ' (process exited with code ' + $process.ExitCode + ')'
            }
        } catch {
        }
        try {
            if ($null -ne $process -and -not $process.HasExited) {
                Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
                $detail = $detail + ' (stopped the unresponsive process)'
            }
        } catch {
        }
        $logTail = Get-Aria2LogTail -Path $paths.Aria2LogFile -Lines 12
        if (-not [string]::IsNullOrWhiteSpace($logTail)) {
            $detail = $detail + [Environment]::NewLine + $logTail
        }
        throw (New-Aria2Error $detail $exitCodes.RpcFailure)
    }

    Write-Output ('aria2 RPC ready on http://127.0.0.1:' + $port + '/jsonrpc (pid ' + $process.Id + ').')
    Write-Aria2EngineLog -Paths $paths -Message ('start ok pid=' + $process.Id + ' port=' + $port) -Secret $secret
    $null = Start-Aria2Watcher -Paths $paths
    $null = Show-Aria2ToastIfEnabled -NoToast:$NoToast -Title 'aria2 started' -Message ('RPC ready on 127.0.0.1:' + $port)
    exit $exitCodes.Success
} catch {
    $code = Get-Aria2ErrorExitCode -ErrorRecord $_ -DefaultCode $exitCodes.RpcFailure
    $message = Get-Aria2ErrorMessage -ErrorRecord $_
    Write-Aria2ErrorLine $message
    if ($null -ne $paths) {
        Write-Aria2EngineLog -Paths $paths -Message ('start failed: ' + $message) -Level 'ERROR'
    }
    exit $code
}
