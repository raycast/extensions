#requires -Version 5.1
# Notify-Aria2.ps1
# aria2 completion/error hook callback. Queries tellStatus for task details and
# shows a Windows toast notification.
#
# Events:
#   -Event download  on-download-complete  (HTTP / FTP / netdisk)
#   -Event bt        on-bt-download-complete (BT, before seeding)
#   -Event error     on-download-error
#
# aria2 fires both on-bt-download-complete and on-download-complete for a BT
# task, so the BT marker written here suppresses the later download event.
# The RPC secret is never logged or displayed.

[CmdletBinding()]
param(
    [string]$Gid = '',
    [string]$Event = '',
    [int]$NumFiles = 0,
    [string]$Path = '',
    [switch]$NoToast
)

$ErrorActionPreference = 'Stop'
$engineRoot = $PSScriptRoot
. (Join-Path $engineRoot 'Aria2Common.ps1')
Initialize-Aria2Console

$exitCodes = $script:Aria2ExitCodes
$paths = $null
try {
    if ([string]::IsNullOrWhiteSpace($Gid)) {
        Write-Aria2ErrorLine 'Missing -Gid for notification.'
        exit $exitCodes.InvalidInput
    }
    $eventName = $Event.Trim().ToLowerInvariant()
    if ($eventName -ne 'download' -and $eventName -ne 'bt' -and $eventName -ne 'error') {
        Write-Aria2ErrorLine ('Invalid -Event value: ' + $Event)
        exit $exitCodes.InvalidInput
    }

    $paths = Get-Aria2StatePaths -Root (Get-Aria2StateRoot)
    if (-not (Test-Path -LiteralPath $paths.NotifiedDir -PathType Container)) {
        try {
            $null = New-Aria2Directory -Path $paths.NotifiedDir
        } catch {
        }
    }
    try {
        $null = Remove-Aria2StaleNotified -Paths $paths -Days 7
    } catch {
    }

    Write-Aria2EngineLog -Paths $paths -Message ('notify: event=' + $eventName + ' gid=' + $Gid + ' files=' + $NumFiles + ' path=' + $Path)

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
    if (-not [bool]$settings['notifications']) {
        exit $exitCodes.Success
    }

    $port = [int]$settings['rpcPort']
    $secret = ''
    if (Test-Path -LiteralPath $paths.SecretFile -PathType Leaf) {
        try {
            $secret = Get-Aria2Secret -Path $paths.SecretFile
        } catch {
            $secret = ''
        }
    }

    $status = $null
    if (-not [string]::IsNullOrEmpty($secret)) {
        if (Test-Aria2RpcAvailable -Port $port -Secret $secret -TimeoutMs 1500) {
            try {
                $status = Invoke-Aria2Rpc -Port $port -Secret $secret -Method 'aria2.tellStatus' -Parameters @($Gid) -TimeoutMs 3000
            } catch {
                $status = $null
            }
        }
    }

    if ($eventName -eq 'bt') {
        try {
            $null = Set-Aria2Notified -Paths $paths -Gid $Gid -EventName 'bt'
        } catch {
        }
        $name = Get-Aria2TaskName -Status $status -FallbackPath $Path
        $totalSize = Get-Aria2StatusNumber -Status $status -Name 'totalLength'
        $sizeText = Format-Aria2ByteSize -Bytes $totalSize
        $body = $name
        if (-not [string]::IsNullOrWhiteSpace($sizeText)) {
            $body = $body + ' (' + $sizeText + ')'
        }
        $body = $body + ' - torrent download complete'
        Write-Aria2EngineLog -Paths $paths -Message ('notify: bt gid=' + $Gid) -Secret $secret
        $null = Show-Aria2ToastIfEnabled -NoToast:$NoToast -Title 'Torrent complete' -Message $body
        exit $exitCodes.Success
    }

    if ($eventName -eq 'download') {
        if (Test-Aria2ShouldSuppressDownloadNotification -Paths $paths -Gid $Gid) {
            Write-Aria2EngineLog -Paths $paths -Message ('notify: suppressed duplicate BT completion gid=' + $Gid) -Secret $secret
            exit $exitCodes.Success
        }
        if (Test-Aria2StatusIsBitTorrent -Status $status) {
            # on-bt-download-complete should have fired first. Wait briefly for
            # its marker so the same BT task does not produce two toasts.
            $waited = 0
            while ($waited -lt 2400 -and -not (Test-Aria2ShouldSuppressDownloadNotification -Paths $paths -Gid $Gid)) {
                Start-Sleep -Milliseconds 200
                $waited = $waited + 200
            }
            if (Test-Aria2ShouldSuppressDownloadNotification -Paths $paths -Gid $Gid) {
                Write-Aria2EngineLog -Paths $paths -Message ('notify: suppressed duplicate BT completion gid=' + $Gid) -Secret $secret
                exit $exitCodes.Success
            }
            # The BT hook did not run; fall back to a single notification and
            # mark the task so any later download event stays silent.
            try {
                $null = Set-Aria2Notified -Paths $paths -Gid $Gid -EventName 'bt'
            } catch {
            }
        }
        $name = Get-Aria2TaskName -Status $status -FallbackPath $Path
        $totalSize = Get-Aria2StatusNumber -Status $status -Name 'totalLength'
        $sizeText = Format-Aria2ByteSize -Bytes $totalSize
        $body = $name
        if (-not [string]::IsNullOrWhiteSpace($sizeText)) {
            $body = $body + ' (' + $sizeText + ')'
        }
        $body = $body + ' - download complete'
        Write-Aria2EngineLog -Paths $paths -Message ('notify: download gid=' + $Gid + ' files=' + $NumFiles) -Secret $secret
        $null = Show-Aria2ToastIfEnabled -NoToast:$NoToast -Title 'Download complete' -Message $body
        try {
            $null = Set-Aria2Notified -Paths $paths -Gid $Gid -EventName 'download'
        } catch {
        }
        exit $exitCodes.Success
    }

    $errorMessage = Get-Aria2StatusString -Status $status -Name 'errorMessage'
    $errorCode = Get-Aria2StatusString -Status $status -Name 'errorCode'
    $name = Get-Aria2TaskName -Status $status -FallbackPath $Path
    $body = $name
    if (-not [string]::IsNullOrWhiteSpace($errorMessage)) {
        $body = $body + ' - ' + $errorMessage
    } elseif (-not [string]::IsNullOrWhiteSpace($errorCode)) {
        $body = $body + ' - aria2 error code ' + $errorCode
    } else {
        $body = $body + ' - download failed'
    }
    Write-Aria2EngineLog -Paths $paths -Message ('notify: error gid=' + $Gid) -Secret $secret
    $null = Show-Aria2ToastIfEnabled -NoToast:$NoToast -Title 'Download failed' -Message $body
    try {
        $null = Set-Aria2Notified -Paths $paths -Gid $Gid -EventName 'error'
    } catch {
    }
    exit $exitCodes.Success
} catch {
    # Hook callbacks must never break a download; report to the engine log only.
    if ($null -ne $paths) {
        Write-Aria2EngineLog -Paths $paths -Message ('notify failed: ' + (Get-Aria2ErrorMessage -ErrorRecord $_)) -Level 'ERROR'
    }
    exit $exitCodes.Success
}
