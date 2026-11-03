#requires -Version 5.1
# Get-Aria2Settings.ps1
# Prints the canonical engine settings from settings.json. The RPC secret is
# never included: it lives only in rpc-secret.txt.
#
# Usage (called by the Raycast extension):
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File Get-Aria2Settings.ps1 -Json

[CmdletBinding()]
param(
    [switch]$Json
)

$ErrorActionPreference = 'Stop'
$engineRoot = $PSScriptRoot
. (Join-Path $engineRoot 'Aria2Common.ps1')
Initialize-Aria2Console

$exitCodes = $script:Aria2ExitCodes
$paths = $null
try {
    $paths = Get-Aria2StatePaths -Root (Get-Aria2StateRoot)
    if (Test-Path -LiteralPath $paths.SettingsFile -PathType Leaf) {
        $settings = Read-Aria2Settings -Path $paths.SettingsFile
    } else {
        $settings = Get-Aria2DefaultSettings
    }

    if ($Json) {
        Write-Output (ConvertTo-Aria2Json -Value $settings -Compress)
        exit $exitCodes.Success
    }

    foreach ($key in $settings.Keys) {
        $value = $settings[$key]
        if ($value -is [bool]) {
            $text = Format-Aria2Boolean -Value $value
        } elseif ($value -is [double]) {
            $text = Format-Aria2SeedRatio -Value $value
        } else {
            $text = [string]$value
        }
        Write-Output ([string]$key + '=' + $text)
    }
    exit $exitCodes.Success
} catch {
    $code = Get-Aria2ErrorExitCode -ErrorRecord $_ -DefaultCode $exitCodes.InvalidInput
    $message = Get-Aria2ErrorMessage -ErrorRecord $_
    Write-Aria2ErrorLine $message
    exit $code
}
