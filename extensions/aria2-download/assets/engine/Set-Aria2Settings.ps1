#requires -Version 5.1
# Set-Aria2Settings.ps1
# Validates a candidate settings JSON file, writes settings.json atomically,
# regenerates aria2.runtime.conf and prints a one-line JSON result:
#
#   {"ok":true,"restartRequired":false}
#
# The RPC secret is never read from or written to settings.json.
#
# Usage (called by the Raycast extension):
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File Set-Aria2Settings.ps1 -JsonPath <temp.json>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$JsonPath
)

$ErrorActionPreference = 'Stop'
$engineRoot = $PSScriptRoot
. (Join-Path $engineRoot 'Aria2Common.ps1')
Initialize-Aria2Console

$exitCodes = $script:Aria2ExitCodes
$paths = $null
try {
    $paths = Get-Aria2StatePaths -Root (Get-Aria2StateRoot)

    if (-not (Test-Path -LiteralPath $JsonPath -PathType Leaf)) {
        throw (New-Aria2Error ('Settings payload not found: ' + $JsonPath) $exitCodes.InvalidInput)
    }

    $raw = Read-Aria2JsonFile -Path $JsonPath
    $newSettings = Merge-Aria2Settings -InputObject $raw
    $validation = Test-Aria2Settings -Settings $newSettings
    if (-not $validation.IsValid) {
        $errorText = $validation.Errors -join '; '
        Write-Aria2ErrorLine ('Invalid settings: ' + $errorText)
        Write-Output (ConvertTo-Aria2Json -Value ([ordered]@{ ok = $false; error = $errorText }) -Compress)
        exit $exitCodes.InvalidInput
    }

    $oldSettings = $null
    if (Test-Path -LiteralPath $paths.SettingsFile -PathType Leaf) {
        $oldSettings = Read-Aria2Settings -Path $paths.SettingsFile
    } else {
        $oldSettings = Get-Aria2DefaultSettings
    }
    $diff = Compare-Aria2Settings -Old $oldSettings -New $newSettings

    $null = Initialize-Aria2StateLayout -Paths $paths
    Save-Aria2Settings -Path $paths.SettingsFile -Settings $newSettings
    $secret = Initialize-Aria2SecretFile -Paths $paths
    $null = New-Aria2RuntimeConf -Settings $newSettings -Secret $secret -Paths $paths

    $restartRequired = $false
    if ($diff.Changed) {
        $oldPort = [int]$oldSettings['rpcPort']
        $restartRequired = [bool](Test-Aria2RpcAvailable -Port $oldPort -Secret $secret -TimeoutMs 1200)
    }

    Write-Output (ConvertTo-Aria2Json -Value ([ordered]@{ ok = $true; restartRequired = $restartRequired }) -Compress)
    Write-Aria2EngineLog -Paths $paths -Message ('settings saved; changed=' + ($diff.ChangedKeys -join ',') + ' restartRequired=' + $restartRequired) -Secret $secret
    exit $exitCodes.Success
} catch {
    $code = Get-Aria2ErrorExitCode -ErrorRecord $_ -DefaultCode $exitCodes.InvalidInput
    $message = Get-Aria2ErrorMessage -ErrorRecord $_
    Write-Aria2ErrorLine $message
    try {
        Write-Output (ConvertTo-Aria2Json -Value ([ordered]@{ ok = $false; error = $message }) -Compress)
    } catch {
    }
    if ($null -ne $paths) {
        Write-Aria2EngineLog -Paths $paths -Message ('settings save failed: ' + $message) -Level 'ERROR'
    }
    exit $code
}
