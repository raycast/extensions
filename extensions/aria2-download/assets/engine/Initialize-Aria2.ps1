#requires -Version 5.1
# Initialize-Aria2.ps1
# Downloads/installs the pinned official aria2 1.37.0 win64 build, verifies its
# SHA-256, then creates settings.json, rpc-secret.txt and the runtime config.
# Never starts the daemon and never requires admin.
#
# Usage (called by the Raycast extension):
#   powershell.exe -NoProfile -ExecutionPolicy Bypass -File Initialize-Aria2.ps1 `
#       -NoToast -DownloadDir <dir> -Connections 16 -Port 6800

[CmdletBinding()]
param(
    [switch]$NoToast,
    [switch]$UseExisting,
    [string]$FromZip = '',
    [switch]$Force,
    [switch]$DryRun,
    [switch]$SkipHashCheck,
    [string]$DownloadDir = '',
    [int]$Connections = 0,
    [int]$Port = 0
)

$ErrorActionPreference = 'Stop'
$engineRoot = $PSScriptRoot
. (Join-Path $engineRoot 'Aria2Common.ps1')
Initialize-Aria2Console

$exitCodes = $script:Aria2ExitCodes
$paths = $null
try {
    if ($UseExisting -and -not [string]::IsNullOrWhiteSpace($FromZip)) {
        throw (New-Aria2Error 'Use either -UseExisting or -FromZip, not both.' $exitCodes.InvalidInput)
    }
    if (-not [string]::IsNullOrWhiteSpace($FromZip) -and -not (Test-Path -LiteralPath $FromZip -PathType Leaf)) {
        throw (New-Aria2Error ('Zip file not found: ' + $FromZip) $exitCodes.InvalidInput)
    }
    if ($Connections -ne 0 -and ($Connections -lt 1 -or $Connections -gt 16)) {
        throw (New-Aria2Error 'Connections must be between 1 and 16.' $exitCodes.InvalidInput)
    }
    if ($Port -ne 0 -and ($Port -lt 1024 -or $Port -gt 65535)) {
        throw (New-Aria2Error 'RPC port must be between 1024 and 65535.' $exitCodes.InvalidInput)
    }

    $paths = Get-Aria2StatePaths -Root (Get-Aria2StateRoot)

    $settingsCreated = $false
    if (Test-Path -LiteralPath $paths.SettingsFile -PathType Leaf) {
        $settings = Read-Aria2Settings -Path $paths.SettingsFile
    } else {
        $settings = Get-Aria2DefaultSettings
        $settingsCreated = $true
    }
    if ($Connections -ne 0) {
        $settings['connections'] = $Connections
    }
    if ($Port -ne 0) {
        $settings['rpcPort'] = $Port
    }
    if (-not [string]::IsNullOrWhiteSpace($DownloadDir)) {
        $settings['downloadDir'] = $DownloadDir
    }
    $settings = Merge-Aria2Settings -InputObject $settings
    $validation = Test-Aria2Settings -Settings $settings
    if (-not $validation.IsValid) {
        throw (New-Aria2Error ('Invalid settings: ' + ($validation.Errors -join '; ')) $exitCodes.InvalidInput)
    }

    $downloadDirText = [string]$settings['downloadDir']
    $rpcPortText = [string]$settings['rpcPort']
    $connectionsText = [string]$settings['connections']

    if ($DryRun) {
        Write-Output ('state root: ' + $paths.Root)
        Write-Output ('download dir: ' + $downloadDirText)
        Write-Output ('rpc port: ' + $rpcPortText)
        Write-Output ('connections: ' + $connectionsText)
        if ($UseExisting) {
            $existingExe = Find-Aria2ExistingExe -Paths $paths
            if ($null -ne $existingExe) {
                Write-Output ('aria2c (existing): ' + $existingExe)
            } else {
                Write-Output 'aria2c (existing): not found (a real run would exit 3)'
            }
        } elseif (-not [string]::IsNullOrWhiteSpace($FromZip)) {
            Write-Output ('package: ' + $FromZip)
            Write-Output ('verify sha256: ' + (-not $SkipHashCheck))
            Write-Output ('install target: ' + $paths.InstallDir)
        } else {
            $installedExe = Get-Aria2InstalledExePath -Paths $paths
            if ($null -ne $installedExe) {
                Write-Output ('aria2c: installed at ' + $installedExe + ' (would reuse)')
            } else {
                Write-Output ('aria2c: not installed (would download ' + $script:Aria2PackageUrl + ')')
            }
        }
        Write-Output ('settings file: ' + $paths.SettingsFile)
        Write-Output ('secret file: ' + $paths.SecretFile + ' (value never printed)')
        Write-Output ('runtime conf: ' + $paths.RuntimeConfFile)
        exit $exitCodes.Success
    }

    $null = Initialize-Aria2StateLayout -Paths $paths

    $installedExe = $null
    $installInfo = $null

    if (-not [string]::IsNullOrWhiteSpace($FromZip)) {
        $packageHash = Get-Aria2FileSha256 -Path $FromZip
        if (-not $SkipHashCheck) {
            if (-not [string]::Equals($packageHash, $script:Aria2PackageSha256, [System.StringComparison]::OrdinalIgnoreCase)) {
                throw (New-Aria2Error ('SHA-256 mismatch for ' + $FromZip + '. Expected ' + $script:Aria2PackageSha256 + ' but got ' + $packageHash + '.') $exitCodes.InstallFailure)
            }
        }
        $installedExe = Expand-Aria2Package -ZipPath $FromZip -TargetDir $paths.InstallDir -ExpectedSha256 $packageHash
        $installInfo = New-Aria2InstallInfo -Version $script:Aria2Version -Sha256 $packageHash -InstallPath $paths.InstallDir
        Write-Output ('installed aria2c from local zip: ' + $installedExe)
    } elseif ($UseExisting) {
        $existingExe = Find-Aria2ExistingExe -Paths $paths
        if ($null -eq $existingExe) {
            throw (New-Aria2Error 'No existing aria2c.exe was found. Install aria2 or run Initialize-Aria2.ps1 without -UseExisting.' $exitCodes.Aria2Missing)
        }
        $installedExe = $existingExe
        $existingVersion = Get-Aria2ExeVersion -ExePath $existingExe
        $existingHash = Get-Aria2FileSha256 -Path $existingExe
        $installInfo = New-Aria2InstallInfo -Version $existingVersion -Sha256 $existingHash -InstallPath (Split-Path -Parent $existingExe)
        Write-Output ('using existing aria2c: ' + $installedExe + ' (version ' + $existingVersion + ')')
    } else {
        $existingExe = $null
        if (-not $Force) {
            $existingExe = Get-Aria2InstalledExePath -Paths $paths
        }
        if ($null -ne $existingExe) {
            $installedExe = $existingExe
            $existingInfo = Read-Aria2InstallInfo -Path $paths.InstallFile
            if ($null -eq $existingInfo) {
                $existingInfo = New-Aria2InstallInfo -Version $script:Aria2Version -Sha256 '' -InstallPath (Split-Path -Parent $existingExe)
            }
            $installInfo = $existingInfo
            Write-Output ('aria2c already installed: ' + $installedExe)
        } else {
            $packagePath = Join-Path $env:TEMP ($script:Aria2PackageFileName + '.' + [guid]::NewGuid().ToString('N') + '.zip')
            try {
                Write-Output ('downloading ' + $script:Aria2PackageUrl)
                $null = Save-Aria2Package -Destination $packagePath
                $packageHash = Get-Aria2FileSha256 -Path $packagePath
                if (-not [string]::Equals($packageHash, $script:Aria2PackageSha256, [System.StringComparison]::OrdinalIgnoreCase)) {
                    throw (New-Aria2Error ('SHA-256 mismatch for the downloaded package. Expected ' + $script:Aria2PackageSha256 + ' but got ' + $packageHash + '.') $exitCodes.InstallFailure)
                }
                $installedExe = Expand-Aria2Package -ZipPath $packagePath -TargetDir $paths.InstallDir -ExpectedSha256 $script:Aria2PackageSha256
                $installInfo = New-Aria2InstallInfo -Version $script:Aria2Version -Sha256 $script:Aria2PackageSha256 -InstallPath $paths.InstallDir
                Write-Output ('installed aria2c: ' + $installedExe)
            } finally {
                if (Test-Path -LiteralPath $packagePath) {
                    Remove-Item -LiteralPath $packagePath -Force -ErrorAction SilentlyContinue
                }
            }
        }
    }

    Save-Aria2InstallInfo -Path $paths.InstallFile -Info $installInfo
    Save-Aria2Settings -Path $paths.SettingsFile -Settings $settings

    $secretCreated = -not (Test-Path -LiteralPath $paths.SecretFile -PathType Leaf)
    $secret = Initialize-Aria2SecretFile -Paths $paths
    $null = New-Aria2RuntimeConf -Settings $settings -Secret $secret -Paths $paths

    if (-not (Test-Path -LiteralPath $downloadDirText -PathType Container)) {
        try {
            $null = New-Aria2Directory -Path $downloadDirText
        } catch {
            Write-Aria2ErrorLine ('Warning: could not create download directory: ' + $downloadDirText)
        }
    }

    Write-Output ('aria2c: ' + $installedExe)
    Write-Output ('settings: ' + $paths.SettingsFile)
    Write-Output ('secret: ' + $paths.SecretFile + ' (value not shown)')
    Write-Output ('runtime conf: ' + $paths.RuntimeConfFile)
    Write-Aria2EngineLog -Paths $paths -Message ('initialize ok exe=' + $installedExe + ' settingsCreated=' + $settingsCreated + ' secretCreated=' + $secretCreated)

    $null = Show-Aria2ToastIfEnabled -NoToast:$NoToast -Title 'aria2 ready' -Message ('aria2 ' + $script:Aria2Version + ' is installed and configured.')
    exit $exitCodes.Success
} catch {
    $code = Get-Aria2ErrorExitCode -ErrorRecord $_ -DefaultCode $exitCodes.InstallFailure
    $message = Get-Aria2ErrorMessage -ErrorRecord $_
    Write-Aria2ErrorLine $message
    if ($null -ne $paths) {
        Write-Aria2EngineLog -Paths $paths -Message ('initialize failed: ' + $message) -Level 'ERROR'
    }
    exit $code
}
