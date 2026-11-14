# Aria2Common.ps1
# Shared helpers for the aria2 Raycast engine (Windows PowerShell 5.1, no admin).
#
# This file only defines functions and constants. Dot-source it from the engine
# scripts and from the offline tests; it must not have top-level side effects.
#
# Runtime state (default):
#   %LOCALAPPDATA%\lat3ncy-toolbox\aria2\
#     install.json, settings.json, rpc-secret.txt, aria2.runtime.conf,
#     session.txt, aria2.log, rpc.log, notified\, bin\1.37.0\aria2c.exe
#
# The state root can be overridden with the LAT3NCY_ARIA2_HOME environment
# variable (used by the offline tests and portable setups). The default is the
# documented contract path.

$script:Aria2EngineRoot = $PSScriptRoot
if ([string]::IsNullOrEmpty($script:Aria2EngineRoot)) {
    $script:Aria2EngineRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}

$script:Aria2Version = '1.37.0'
$script:Aria2PackageFileName = 'aria2-1.37.0-win-64bit-build1.zip'
$script:Aria2PackageUrl = 'https://github.com/aria2/aria2/releases/download/release-1.37.0/aria2-1.37.0-win-64bit-build1.zip'
$script:Aria2PackageSha256 = '67D015301EEF0B612191212D564C5BB0A14B5B9C4796B76454276A4D28D9B288'

$script:Aria2ExitCodes = @{
    Success = 0
    InvalidInput = 2
    Aria2Missing = 3
    RpcFailure = 4
    Busy = 5
    InstallFailure = 6
}

$script:Aria2FileNames = @{
    Settings = 'settings.json'
    Secret = 'rpc-secret.txt'
    Install = 'install.json'
    RuntimeConf = 'aria2.runtime.conf'
    Session = 'session.txt'
    Aria2Log = 'aria2.log'
    RpcLog = 'rpc.log'
    Template = 'aria2.conf'
    HookScript = 'Aria2Hook.vbs'
    NotifyScript = 'Notify-Aria2.ps1'
    WatchScript = 'Watch-Aria2.ps1'
    WatchPid = 'watch.pid'
    NotifiedDir = 'notified'
}

# Field types used to normalize user/extension supplied settings.
$script:Aria2SettingTypes = @{
    rpcPort = 'int'
    downloadDir = 'path'
    connections = 'int'
    split = 'int'
    minSplitSize = 'size'
    maxConcurrentDownloads = 'int'
    fileAllocation = 'string'
    diskCache = 'size'
    maxOverallDownloadLimit = 'size'
    maxOverallUploadLimit = 'size'
    proxyMode = 'string'
    allProxy = 'string'
    noProxy = 'string'
    checkCertificate = 'bool'
    connectTimeout = 'int'
    timeout = 'int'
    maxTries = 'int'
    retryWait = 'int'
    lowestSpeedLimit = 'size'
    saveSessionInterval = 'int'
    notifications = 'bool'
    autoStartOnAdd = 'bool'
    autoStopWhenIdle = 'bool'
    listenPort = 'int'
    dhtListenPort = 'int'
    enableDht = 'bool'
    enablePeerExchange = 'bool'
    btEnableLpd = 'bool'
    btMaxPeers = 'int'
    btRequireCrypto = 'bool'
    seedTime = 'int'
    seedRatio = 'double'
    btSaveMetadata = 'bool'
    btLoadSavedMetadata = 'bool'
    rpcSaveUploadMetadata = 'bool'
    btTracker = 'string'
}

# ---------------------------------------------------------------------------
# Errors and exit codes
# ---------------------------------------------------------------------------

function New-Aria2Error {
    param(
        [Parameter(Mandatory = $true)][string]$Message,
        [int]$ExitCode = 2
    )
    $exception = New-Object System.Exception -ArgumentList $Message
    $exception.Data['Aria2ExitCode'] = $ExitCode
    return $exception
}

function Get-Aria2ErrorExitCode {
    param(
        [Parameter(Mandatory = $true)]$ErrorRecord,
        [int]$DefaultCode = 2
    )
    try {
        $exception = $ErrorRecord.Exception
        $depth = 0
        while ($null -ne $exception -and $depth -lt 6) {
            if ($null -ne $exception.Data -and $exception.Data.Contains('Aria2ExitCode')) {
                return [int]$exception.Data['Aria2ExitCode']
            }
            $exception = $exception.InnerException
            $depth++
        }
    } catch {
    }
    return $DefaultCode
}

function Get-Aria2ErrorMessage {
    param([Parameter(Mandatory = $true)]$ErrorRecord)
    try {
        if ($null -ne $ErrorRecord.Exception -and -not [string]::IsNullOrEmpty($ErrorRecord.Exception.Message)) {
            return $ErrorRecord.Exception.Message
        }
    } catch {
    }
    return 'Unknown engine error.'
}

function Write-Aria2ErrorLine {
    param([string]$Message)
    try {
        [Console]::Error.WriteLine('[aria2-engine] ' + $Message)
    } catch {
    }
}

function Initialize-Aria2Console {
    try {
        [Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
    } catch {
    }
    try {
        [Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
    } catch {
    }
}

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

function Get-Aria2StateRoot {
    param([string]$Override = '')
    if (-not [string]::IsNullOrWhiteSpace($Override)) {
        return $Override.Trim()
    }
    if (-not [string]::IsNullOrWhiteSpace($env:LAT3NCY_ARIA2_HOME)) {
        return $env:LAT3NCY_ARIA2_HOME.Trim()
    }
    $localAppData = $env:LOCALAPPDATA
    if ([string]::IsNullOrWhiteSpace($localAppData)) {
        try {
            $localAppData = [Environment]::GetFolderPath('LocalApplicationData')
        } catch {
            $localAppData = ''
        }
    }
    if ([string]::IsNullOrWhiteSpace($localAppData) -and -not [string]::IsNullOrWhiteSpace($env:USERPROFILE)) {
        $localAppData = Join-Path $env:USERPROFILE 'AppData\Local'
    }
    if ([string]::IsNullOrWhiteSpace($localAppData)) {
        throw 'LOCALAPPDATA is not defined; cannot resolve the aria2 state directory.'
    }
    return (Join-Path $localAppData 'lat3ncy-toolbox\aria2')
}

function Get-Aria2StatePaths {
    param([string]$Root = '')
    if ([string]::IsNullOrWhiteSpace($Root)) {
        $Root = Get-Aria2StateRoot
    }
    $Root = $Root.Trim()
    if ([string]::IsNullOrWhiteSpace($Root)) {
        throw 'State root is empty.'
    }
    $rootFull = [System.IO.Path]::GetFullPath($Root)
    $binDir = Join-Path $rootFull 'bin'
    $installDir = Join-Path $binDir $script:Aria2Version
    return [pscustomobject]@{
        Root = $rootFull
        BinDir = $binDir
        InstallDir = $installDir
        Aria2cExe = (Join-Path $installDir 'aria2c.exe')
        InstallFile = (Join-Path $rootFull $script:Aria2FileNames.Install)
        SettingsFile = (Join-Path $rootFull $script:Aria2FileNames.Settings)
        SecretFile = (Join-Path $rootFull $script:Aria2FileNames.Secret)
        RuntimeConfFile = (Join-Path $rootFull $script:Aria2FileNames.RuntimeConf)
        SessionFile = (Join-Path $rootFull $script:Aria2FileNames.Session)
        Aria2LogFile = (Join-Path $rootFull $script:Aria2FileNames.Aria2Log)
        RpcLogFile = (Join-Path $rootFull $script:Aria2FileNames.RpcLog)
        NotifiedDir = (Join-Path $rootFull $script:Aria2FileNames.NotifiedDir)
        EngineRoot = $script:Aria2EngineRoot
        TemplateFile = (Join-Path $script:Aria2EngineRoot $script:Aria2FileNames.Template)
        HookScript = (Join-Path $script:Aria2EngineRoot $script:Aria2FileNames.HookScript)
        NotifyScript = (Join-Path $script:Aria2EngineRoot $script:Aria2FileNames.NotifyScript)
        WatchScript = (Join-Path $script:Aria2EngineRoot $script:Aria2FileNames.WatchScript)
        WatchPidFile = (Join-Path $rootFull $script:Aria2FileNames.WatchPid)
    }
}

function New-Aria2Directory {
    param([Parameter(Mandatory = $true)][string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) {
        throw 'Directory path is empty.'
    }
    if (-not (Test-Path -LiteralPath $Path -PathType Container)) {
        $null = New-Item -ItemType Directory -Path $Path -Force -ErrorAction Stop
    }
    return $Path
}

function Initialize-Aria2StateLayout {
    param([Parameter(Mandatory = $true)]$Paths)
    $null = New-Aria2Directory -Path $Paths.Root
    $null = New-Aria2Directory -Path $Paths.BinDir
    $null = New-Aria2Directory -Path $Paths.NotifiedDir
    return $Paths
}

# ---------------------------------------------------------------------------
# Text and JSON helpers
# ---------------------------------------------------------------------------

function Read-Aria2Utf8Text {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw ('File not found: ' + $Path)
    }
    $encoding = New-Object System.Text.UTF8Encoding($false)
    return [System.IO.File]::ReadAllText($Path, $encoding)
}

function Write-Aria2Utf8TextAtomic {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Content
    )
    $directory = Split-Path -Parent $Path
    if ([string]::IsNullOrEmpty($directory)) {
        $directory = '.'
    }
    $null = New-Aria2Directory -Path $directory
    $tempPath = Join-Path $directory ('.' + (Split-Path -Leaf $Path) + '.tmp-' + [guid]::NewGuid().ToString('N'))
    $encoding = New-Object System.Text.UTF8Encoding($false)
    try {
        [System.IO.File]::WriteAllText($tempPath, $Content, $encoding)
        if (Test-Path -LiteralPath $Path -PathType Leaf) {
            # Windows PowerShell 5.1 coerces a literal $null backup argument to
            # an empty string, which makes File.Replace throw "The path is not
            # of a legal form". NullString::Value is a real null and keeps the
            # replace atomic. A unique backup path is the fallback.
            try {
                $nullBackup = [System.Management.Automation.Language.NullString]::Value
                [System.IO.File]::Replace($tempPath, $Path, $nullBackup)
            } catch {
                if (-not (Test-Path -LiteralPath $tempPath -PathType Leaf)) {
                    throw
                }
                $backupPath = Join-Path $directory ('.' + (Split-Path -Leaf $Path) + '.bak-' + [guid]::NewGuid().ToString('N'))
                try {
                    [System.IO.File]::Replace($tempPath, $Path, $backupPath)
                } finally {
                    if (Test-Path -LiteralPath $backupPath) {
                        Remove-Item -LiteralPath $backupPath -Force -ErrorAction SilentlyContinue
                    }
                }
            }
        } else {
            [System.IO.File]::Move($tempPath, $Path)
        }
    } catch {
        if (Test-Path -LiteralPath $tempPath) {
            Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
        }
        throw
    }
}

function ConvertTo-Aria2InvariantString {
    param([Parameter(Mandatory = $true)]$Value)
    return [string]::Format([System.Globalization.CultureInfo]::InvariantCulture, '{0}', $Value)
}

function ConvertTo-Aria2JsonStringLiteral {
    param([AllowNull()][string]$Text)
    if ($null -eq $Text) {
        return '""'
    }
    $builder = New-Object System.Text.StringBuilder
    $null = $builder.Append('"')
    for ($index = 0; $index -lt $Text.Length; $index++) {
        $character = $Text[$index]
        $code = [int]$character
        if ($code -eq 34) {
            $null = $builder.Append('\"')
        } elseif ($code -eq 92) {
            $null = $builder.Append('\\')
        } elseif ($code -lt 32 -or $code -gt 126) {
            $null = $builder.Append(('\u{0:x4}' -f $code))
        } else {
            $null = $builder.Append($character)
        }
    }
    $null = $builder.Append('"')
    return $builder.ToString()
}

function ConvertTo-Aria2Json {
    param(
        [AllowNull()]$Value,
        [switch]$Compress,
        [int]$Level = 0
    )
    if ($null -eq $Value) {
        return 'null'
    }
    if ($Value -is [bool]) {
        if ([bool]$Value) {
            return 'true'
        }
        return 'false'
    }
    if ($Value -is [string]) {
        return (ConvertTo-Aria2JsonStringLiteral -Text ([string]$Value))
    }
    if ($Value -is [char]) {
        return (ConvertTo-Aria2JsonStringLiteral -Text ([string]$Value))
    }
    if ($Value -is [int] -or $Value -is [long] -or $Value -is [int16] -or $Value -is [byte] -or $Value -is [sbyte] -or $Value -is [uint16] -or $Value -is [uint32] -or $Value -is [uint64]) {
        return (ConvertTo-Aria2InvariantString -Value $Value)
    }
    if ($Value -is [double] -or $Value -is [single] -or $Value -is [decimal]) {
        $number = [double]$Value
        if ([double]::IsNaN($number) -or [double]::IsInfinity($number)) {
            throw 'Cannot serialize a non-finite number to JSON.'
        }
        return (ConvertTo-Aria2InvariantString -Value $Value)
    }
    if ($Value -is [System.Collections.IDictionary]) {
        return (ConvertTo-Aria2JsonDictionary -Dictionary $Value -Compress:$Compress -Level $Level)
    }
    if ($Value -is [System.Management.Automation.PSCustomObject]) {
        $ordered = [ordered]@{}
        foreach ($property in $Value.PSObject.Properties) {
            if ($property.MemberType -eq 'NoteProperty' -or $property.MemberType -eq 'Property') {
                $ordered[$property.Name] = $property.Value
            }
        }
        return (ConvertTo-Aria2JsonDictionary -Dictionary $ordered -Compress:$Compress -Level $Level)
    }
    if ($Value -is [System.Collections.IEnumerable]) {
        $items = New-Object 'System.Collections.Generic.List[string]'
        foreach ($item in $Value) {
            $items.Add((ConvertTo-Aria2Json -Value $item -Compress:$Compress -Level ($Level + 1)))
        }
        if ($Compress) {
            return ('[' + ($items -join ',') + ']')
        }
        if ($items.Count -eq 0) {
            return '[]'
        }
        $padding = ' ' * (2 * ($Level + 1))
        $closingPadding = ' ' * (2 * $Level)
        return ('[' + "`n" + (($items | ForEach-Object { $padding + $_ }) -join (',' + "`n")) + "`n" + $closingPadding + ']')
    }
    return (ConvertTo-Aria2JsonStringLiteral -Text ([string]$Value))
}

function ConvertTo-Aria2JsonDictionary {
    param(
        [Parameter(Mandatory = $true)]$Dictionary,
        [switch]$Compress,
        [int]$Level = 0
    )
    $entries = New-Object 'System.Collections.Generic.List[string]'
    foreach ($key in $Dictionary.Keys) {
        $jsonKey = ConvertTo-Aria2JsonStringLiteral -Text ([string]$key)
        $jsonValue = ConvertTo-Aria2Json -Value $Dictionary[$key] -Compress:$Compress -Level ($Level + 1)
        if ($Compress) {
            $entries.Add($jsonKey + ':' + $jsonValue)
        } else {
            $entries.Add($jsonKey + ': ' + $jsonValue)
        }
    }
    if ($Compress) {
        return ('{' + ($entries -join ',') + '}')
    }
    if ($entries.Count -eq 0) {
        return '{}'
    }
    $padding = ' ' * (2 * ($Level + 1))
    $closingPadding = ' ' * (2 * $Level)
    return ('{' + "`n" + (($entries | ForEach-Object { $padding + $_ }) -join (',' + "`n")) + "`n" + $closingPadding + '}')
}

function Write-Aria2JsonFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [AllowNull()]$Value,
        [switch]$Compress
    )
    $json = ConvertTo-Aria2Json -Value $Value -Compress:$Compress
    Write-Aria2Utf8TextAtomic -Path $Path -Content ($json + "`n")
}

function Read-Aria2JsonFile {
    param([Parameter(Mandatory = $true)][string]$Path)
    $text = Read-Aria2Utf8Text -Path $Path
    if ([string]::IsNullOrWhiteSpace($text)) {
        throw ('JSON file is empty: ' + $Path)
    }
    try {
        return ($text | ConvertFrom-Json)
    } catch {
        throw ('Invalid JSON in ' + $Path + ': ' + $_.Exception.Message)
    }
}

# ---------------------------------------------------------------------------
# Type coercion helpers for settings input
# ---------------------------------------------------------------------------

function Convert-Aria2ToInteger {
    param($Value, [string]$Key)
    if ($null -eq $Value) {
        throw ("Setting '" + $Key + "' must be an integer.")
    }
    if ($Value -is [bool]) {
        throw ("Setting '" + $Key + "' must be an integer.")
    }
    if ($Value -is [int] -or $Value -is [long] -or $Value -is [int16] -or $Value -is [byte] -or $Value -is [sbyte] -or $Value -is [uint16] -or $Value -is [uint32] -or $Value -is [uint64]) {
        $number = [long]$Value
        if ($number -lt -2147483648 -or $number -gt 2147483647) {
            throw ("Setting '" + $Key + "' is out of range.")
        }
        return [int]$number
    }
    if ($Value -is [double] -or $Value -is [single] -or $Value -is [decimal]) {
        $number = [double]$Value
        if ([double]::IsNaN($number) -or [double]::IsInfinity($number) -or $number -ne [math]::Truncate($number)) {
            throw ("Setting '" + $Key + "' must be an integer.")
        }
        if ($number -lt -2147483648 -or $number -gt 2147483647) {
            throw ("Setting '" + $Key + "' is out of range.")
        }
        return [int]$number
    }
    if ($Value -is [string]) {
        $parsed = 0
        if ([int]::TryParse($Value.Trim(), [System.Globalization.NumberStyles]::Integer, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$parsed)) {
            return $parsed
        }
    }
    throw ("Setting '" + $Key + "' must be an integer.")
}

function Convert-Aria2ToDouble {
    param($Value, [string]$Key)
    if ($null -eq $Value -or $Value -is [bool]) {
        throw ("Setting '" + $Key + "' must be a number.")
    }
    $parsed = 0.0
    if ($Value -is [string]) {
        if ([double]::TryParse($Value.Trim(), [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$parsed)) {
            if (-not [double]::IsNaN($parsed) -and -not [double]::IsInfinity($parsed)) {
                return $parsed
            }
        }
        throw ("Setting '" + $Key + "' must be a number.")
    }
    try {
        $number = [double]$Value
    } catch {
        throw ("Setting '" + $Key + "' must be a number.")
    }
    if ([double]::IsNaN($number) -or [double]::IsInfinity($number)) {
        throw ("Setting '" + $Key + "' must be a finite number.")
    }
    return $number
}

function Convert-Aria2ToBoolean {
    param($Value, [string]$Key)
    if ($Value -is [bool]) {
        return [bool]$Value
    }
    if ($Value -is [string]) {
        $text = $Value.Trim().ToLowerInvariant()
        if ($text -eq 'true' -or $text -eq '1') {
            return $true
        }
        if ($text -eq 'false' -or $text -eq '0') {
            return $false
        }
        throw ("Setting '" + $Key + "' must be true or false.")
    }
    if ($Value -is [int] -or $Value -is [long] -or $Value -is [int16]) {
        $number = [int]$Value
        if ($number -eq 0) {
            return $false
        }
        if ($number -eq 1) {
            return $true
        }
    }
    throw ("Setting '" + $Key + "' must be true or false.")
}

function Convert-Aria2ToSettingString {
    param($Value, [string]$Key, [switch]$AllowEmpty)
    if ($null -eq $Value) {
        if ($AllowEmpty) {
            return ''
        }
        throw ("Setting '" + $Key + "' must not be empty.")
    }
    if ($Value -is [bool]) {
        throw ("Setting '" + $Key + "' must be a string.")
    }
    if ($Value -is [string]) {
        return $Value
    }
    if ($Value -is [int] -or $Value -is [long] -or $Value -is [int16] -or $Value -is [double] -or $Value -is [single] -or $Value -is [decimal]) {
        return (ConvertTo-Aria2InvariantString -Value $Value)
    }
    throw ("Setting '" + $Key + "' must be a string.")
}

function Convert-Aria2ToSettingPath {
    param($Value, [string]$Key)
    $text = Convert-Aria2ToSettingString -Value $Value -Key $Key
    $text = [Environment]::ExpandEnvironmentVariables($text).Trim()
    if ($text.Length -eq 0) {
        throw ("Setting '" + $Key + "' must not be empty.")
    }
    return $text
}

function Convert-Aria2ToTrackerList {
    param([string]$Value)
    if ([string]::IsNullOrWhiteSpace($Value)) {
        return ''
    }
    $parts = [regex]::Split($Value, '[\r\n,;]+')
    $trackers = New-Object 'System.Collections.Generic.List[string]'
    foreach ($part in $parts) {
        $entry = $part.Trim()
        if ($entry.Length -gt 0) {
            $trackers.Add($entry)
        }
    }
    return ($trackers -join ',')
}

function Test-Aria2AbsolutePath {
    param([string]$Path)
    if ([string]::IsNullOrWhiteSpace($Path)) {
        return $false
    }
    $text = $Path.Trim()
    if (-not [regex]::IsMatch($text, '^(?i)(?:[A-Za-z]:[\\/]|\\\\[^\\/]+[\\/][^\\/]+)')) {
        return $false
    }
    $remainder = $text
    if ($remainder -match '^[A-Za-z]:') {
        $remainder = $remainder.Substring(2)
    } elseif ($remainder.StartsWith('\\')) {
        $remainder = $remainder.Substring(2)
    }
    foreach ($invalid in [System.IO.Path]::GetInvalidPathChars()) {
        if ($remainder.IndexOf($invalid) -ge 0) {
            return $false
        }
    }
    foreach ($invalid in @([char]34, [char]60, [char]62, [char]124, [char]58)) {
        if ($remainder.IndexOf($invalid) -ge 0) {
            return $false
        }
    }
    return $true
}

# ---------------------------------------------------------------------------
# Settings: defaults, normalization, validation, files
# ---------------------------------------------------------------------------

function Get-Aria2DefaultSettings {
    $profileDir = $env:USERPROFILE
    if ([string]::IsNullOrWhiteSpace($profileDir)) {
        throw 'USERPROFILE is not defined; cannot build default settings.'
    }
    $downloadDir = Join-Path $profileDir 'Downloads'
    $settings = [ordered]@{
        rpcPort = 6800
        downloadDir = $downloadDir
        connections = 16
        split = 16
        minSplitSize = '1M'
        maxConcurrentDownloads = 3
        fileAllocation = 'none'
        diskCache = '64M'
        maxOverallDownloadLimit = '0'
        maxOverallUploadLimit = '2M'
        proxyMode = 'system'
        allProxy = ''
        noProxy = ''
        checkCertificate = $true
        connectTimeout = 30
        timeout = 60
        maxTries = 3
        retryWait = 5
        lowestSpeedLimit = '0'
        saveSessionInterval = 30
        notifications = $true
        autoStartOnAdd = $true
        autoStopWhenIdle = $true
        listenPort = 6881
        dhtListenPort = 6881
        enableDht = $true
        enablePeerExchange = $true
        btEnableLpd = $false
        btMaxPeers = 55
        btRequireCrypto = $false
        seedTime = 0
        seedRatio = 1.0
        btSaveMetadata = $true
        btLoadSavedMetadata = $true
        rpcSaveUploadMetadata = $true
        btTracker = ''
    }
    return ,$settings
}

function Convert-Aria2SettingValue {
    param([string]$Key, $Value)
    $type = $script:Aria2SettingTypes[$Key]
    if ($null -eq $type) {
        return $Value
    }
    $converted = $null
    switch ($type) {
        'int' {
            $converted = Convert-Aria2ToInteger -Value $Value -Key $Key
        }
        'double' {
            $converted = Convert-Aria2ToDouble -Value $Value -Key $Key
        }
        'bool' {
            $converted = Convert-Aria2ToBoolean -Value $Value -Key $Key
        }
        'size' {
            $converted = Convert-Aria2ToSettingString -Value $Value -Key $Key
        }
        'path' {
            $converted = Convert-Aria2ToSettingPath -Value $Value -Key $Key
        }
        default {
            $converted = Convert-Aria2ToSettingString -Value $Value -Key $Key -AllowEmpty
        }
    }
    if ($Key -eq 'proxyMode' -or $Key -eq 'fileAllocation') {
        $converted = ([string]$converted).Trim().ToLowerInvariant()
    }
    if ($Key -eq 'btTracker') {
        $converted = Convert-Aria2ToTrackerList -Value ([string]$converted)
    }
    return $converted
}

function Merge-Aria2Settings {
    param([AllowNull()]$InputObject)
    $defaults = Get-Aria2DefaultSettings
    $provided = @{}
    if ($null -ne $InputObject) {
        if ($InputObject -is [System.Collections.IDictionary]) {
            foreach ($key in $InputObject.Keys) {
                $provided[[string]$key] = $InputObject[$key]
            }
        } elseif ($InputObject -is [System.Management.Automation.PSCustomObject]) {
            foreach ($property in $InputObject.PSObject.Properties) {
                if ($property.MemberType -eq 'NoteProperty' -or $property.MemberType -eq 'Property') {
                    $provided[$property.Name] = $property.Value
                }
            }
        } else {
            throw 'Settings payload must be a JSON object.'
        }
    }
    $result = [ordered]@{}
    foreach ($key in $defaults.Keys) {
        if ($provided.ContainsKey($key)) {
            $result[$key] = Convert-Aria2SettingValue -Key $key -Value $provided[$key]
        } else {
            $result[$key] = $defaults[$key]
        }
    }
    return ,$result
}

function Convert-Aria2SizeToBytes {
    param([string]$Value, [string]$Key = 'size')
    if ([string]::IsNullOrWhiteSpace($Value)) {
        throw ("Setting '" + $Key + "' must be an aria2 size such as 1M.")
    }
    $text = $Value.Trim().ToUpperInvariant()
    $match = [regex]::Match($text, '^(?<number>[0-9]+)(?<unit>[KMG]?)$')
    if (-not $match.Success) {
        throw ("Setting '" + $Key + "' is not a valid aria2 size: " + $Value)
    }
    $number = [double]$match.Groups['number'].Value
    $unit = $match.Groups['unit'].Value
    $multiplier = 1.0
    if ($unit -eq 'K') {
        $multiplier = 1024.0
    } elseif ($unit -eq 'M') {
        $multiplier = 1048576.0
    } elseif ($unit -eq 'G') {
        $multiplier = 1073741824.0
    }
    return ($number * $multiplier)
}

function Test-Aria2Settings {
    param([Parameter(Mandatory = $true)]$Settings)
    $errors = New-Object 'System.Collections.Generic.List[string]'

    $integerRanges = @(
        @('rpcPort', 1024, 65535),
        @('connections', 1, 16),
        @('split', 1, 16),
        @('maxConcurrentDownloads', 1, 10),
        @('connectTimeout', 1, 600),
        @('timeout', 1, 3600),
        @('maxTries', 1, 100),
        @('retryWait', 0, 600),
        @('listenPort', 1024, 65535),
        @('dhtListenPort', 1024, 65535),
        @('seedTime', 0, 100000),
        @('btMaxPeers', 1, 1000),
        @('saveSessionInterval', 10, 300)
    )
    foreach ($range in $integerRanges) {
        $key = [string]$range[0]
        $minimum = [int]$range[1]
        $maximum = [int]$range[2]
        $value = $Settings[$key]
        if ($null -eq $value -or [int]$value -lt $minimum -or [int]$value -gt $maximum) {
            $errors.Add(($key + ' must be an integer between ' + $minimum + ' and ' + $maximum + ' (got ' + $value + ').'))
        }
    }

    $seedRatio = [double]$Settings['seedRatio']
    if ($seedRatio -lt 0 -or $seedRatio -gt 100) {
        $errors.Add('seedRatio must be between 0 and 100 (got ' + (ConvertTo-Aria2InvariantString -Value $seedRatio) + ').')
    }

    $fileAllocation = [string]$Settings['fileAllocation']
    if ($fileAllocation -ne 'none' -and $fileAllocation -ne 'prealloc') {
        $errors.Add("fileAllocation must be 'none' or 'prealloc' (got '" + $fileAllocation + "').")
    }

    $proxyMode = [string]$Settings['proxyMode']
    if ($proxyMode -ne 'system' -and $proxyMode -ne 'direct' -and $proxyMode -ne 'custom') {
        $errors.Add("proxyMode must be 'system', 'direct' or 'custom' (got '" + $proxyMode + "').")
    }
    $allProxy = [string]$Settings['allProxy']
    if ($proxyMode -eq 'custom') {
        if ([string]::IsNullOrWhiteSpace($allProxy)) {
            $errors.Add('allProxy is required when proxyMode is custom.')
        } elseif (-not [regex]::IsMatch($allProxy.Trim(), '^(?i)[A-Za-z][A-Za-z0-9+.\-]*://')) {
            $errors.Add('allProxy must include a scheme, for example http://127.0.0.1:7890.')
        }
    }

    $minSplitValue = [string]$Settings['minSplitSize']
    try {
        $minSplitBytes = Convert-Aria2SizeToBytes -Value $minSplitValue -Key 'minSplitSize'
        if ($minSplitBytes -lt 1048576 -or $minSplitBytes -gt 1073741824) {
            $errors.Add('minSplitSize must be between 1M and 1024M (got ' + $minSplitValue + ').')
        }
    } catch {
        $errors.Add($_.Exception.Message)
    }

    $diskCacheValue = [string]$Settings['diskCache']
    try {
        $diskCacheBytes = Convert-Aria2SizeToBytes -Value $diskCacheValue -Key 'diskCache'
        if ($diskCacheBytes -lt 16777216 -or $diskCacheBytes -gt 1073741824) {
            $errors.Add('diskCache must be between 16M and 1024M (got ' + $diskCacheValue + ').')
        }
    } catch {
        $errors.Add($_.Exception.Message)
    }

    foreach ($limitKey in @('maxOverallDownloadLimit', 'maxOverallUploadLimit', 'lowestSpeedLimit')) {
        $limitValue = ([string]$Settings[$limitKey]).Trim()
        if (-not [regex]::IsMatch($limitValue, '^(?i)(0|[0-9]+[KMG]?)$')) {
            $errors.Add($limitKey + " must be '0' or an aria2 size such as 2M (got '" + $limitValue + "').")
        }
    }

    $downloadDir = [string]$Settings['downloadDir']
    if ([string]::IsNullOrWhiteSpace($downloadDir)) {
        $errors.Add('downloadDir must not be empty.')
    } elseif (-not (Test-Aria2AbsolutePath -Path $downloadDir)) {
        $errors.Add('downloadDir must be an absolute Windows path, for example C:\Users\me\Downloads.')
    } else {
        try {
            if (Test-Path -LiteralPath $downloadDir -PathType Leaf) {
                $errors.Add('downloadDir points to a file, not a directory: ' + $downloadDir)
            }
        } catch {
        }
    }

    $trackers = [string]$Settings['btTracker']
    if (-not [string]::IsNullOrWhiteSpace($trackers)) {
        foreach ($tracker in $trackers.Split(',')) {
            $entry = $tracker.Trim()
            if ($entry.Length -gt 0 -and $entry.IndexOf('://') -lt 0) {
                $errors.Add("btTracker entries must be tracker URIs (got '" + $entry + "').")
                break
            }
        }
    }

    return [pscustomobject]@{
        IsValid = ($errors.Count -eq 0)
        Errors = $errors.ToArray()
    }
}

function Read-Aria2Settings {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [switch]$AllowMissing
    )
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        if ($AllowMissing) {
            return $null
        }
        throw ('Settings file not found: ' + $Path)
    }
    $raw = Read-Aria2JsonFile -Path $Path
    $settings = Merge-Aria2Settings -InputObject $raw
    $validation = Test-Aria2Settings -Settings $settings
    if (-not $validation.IsValid) {
        throw ('Invalid settings in ' + $Path + ': ' + ($validation.Errors -join '; '))
    }
    return ,$settings
}

function Save-Aria2Settings {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)]$Settings
    )
    $validation = Test-Aria2Settings -Settings $Settings
    if (-not $validation.IsValid) {
        throw ('Refusing to write invalid settings: ' + ($validation.Errors -join '; '))
    }
    Write-Aria2JsonFile -Path $Path -Value $Settings
}

function Ensure-Aria2SettingsFile {
    param([Parameter(Mandatory = $true)]$Paths)
    if (Test-Path -LiteralPath $Paths.SettingsFile -PathType Leaf) {
        return (Read-Aria2Settings -Path $Paths.SettingsFile)
    }
    $settings = Get-Aria2DefaultSettings
    Save-Aria2Settings -Path $Paths.SettingsFile -Settings $settings
    return ,$settings
}

function Compare-Aria2Settings {
    param($Old, $New)
    $changed = New-Object 'System.Collections.Generic.List[string]'
    if ($null -ne $New) {
        foreach ($key in $New.Keys) {
            $keyName = [string]$key
            $hasOld = $false
            $oldValue = $null
            if ($null -ne $Old -and $Old.Contains($key)) {
                $oldValue = $Old[$key]
                $hasOld = $true
            }
            if (-not $hasOld) {
                $changed.Add($keyName)
                continue
            }
            $newValue = $New[$key]
            $equal = $false
            if ($null -eq $oldValue -and $null -eq $newValue) {
                $equal = $true
            } elseif ($null -eq $oldValue -or $null -eq $newValue) {
                $equal = $false
            } elseif ($oldValue -is [double] -or $newValue -is [double]) {
                $equal = ([double]$oldValue -eq [double]$newValue)
            } elseif ($oldValue -is [bool] -or $newValue -is [bool]) {
                $equal = ([bool]$oldValue -eq [bool]$newValue)
            } else {
                $equal = ([string]$oldValue -eq [string]$newValue)
            }
            if (-not $equal) {
                $changed.Add($keyName)
            }
        }
    }
    return [pscustomobject]@{
        Changed = ($changed.Count -gt 0)
        ChangedKeys = $changed.ToArray()
    }
}

# ---------------------------------------------------------------------------
# RPC secret
# ---------------------------------------------------------------------------

function New-Aria2Secret {
    $bytes = New-Object 'byte[]' 16
    $generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try {
        $generator.GetBytes($bytes)
    } finally {
        $generator.Dispose()
    }
    $builder = New-Object System.Text.StringBuilder
    foreach ($byte in $bytes) {
        $null = $builder.Append($byte.ToString('x2'))
    }
    return $builder.ToString()
}

function Get-Aria2Secret {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw ('RPC secret file not found: ' + $Path)
    }
    $raw = Read-Aria2Utf8Text -Path $Path
    if ($raw.IndexOf("`r") -ge 0 -or $raw.IndexOf("`n") -ge 0) {
        throw ('RPC secret file must contain a single line: ' + $Path)
    }
    $secret = $raw.Trim()
    if ($secret.Length -eq 0) {
        throw ('RPC secret file is empty: ' + $Path)
    }
    return $secret
}

function Set-Aria2SecretAcl {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return $false
    }
    try {
        $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
        $acl = New-Object System.Security.AccessControl.FileSecurity
        $acl.SetAccessRuleProtection($true, $false)
        $acl.SetOwner($identity)
        $identities = @(
            $identity,
            (New-Object System.Security.Principal.SecurityIdentifier('S-1-5-18')),
            (New-Object System.Security.Principal.SecurityIdentifier('S-1-5-32-544'))
        )
        foreach ($sid in $identities) {
            $rule = New-Object System.Security.AccessControl.FileSystemAccessRule($sid, [System.Security.AccessControl.FileSystemRights]::FullControl, [System.Security.AccessControl.AccessControlType]::Allow)
            $null = $acl.AddAccessRule($rule)
        }
        Set-Acl -LiteralPath $Path -AclObject $acl -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Initialize-Aria2SecretFile {
    param([Parameter(Mandatory = $true)]$Paths)
    if (Test-Path -LiteralPath $Paths.SecretFile -PathType Leaf) {
        return (Get-Aria2Secret -Path $Paths.SecretFile)
    }
    $secret = New-Aria2Secret
    Write-Aria2Utf8TextAtomic -Path $Paths.SecretFile -Content $secret
    $null = Set-Aria2SecretAcl -Path $Paths.SecretFile
    return $secret
}

# ---------------------------------------------------------------------------
# Hashing and aria2 install metadata
# ---------------------------------------------------------------------------

function Get-Aria2FileSha256 {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw ('File not found: ' + $Path)
    }
    $algorithm = [System.Security.Cryptography.SHA256]::Create()
    $stream = [System.IO.File]::OpenRead($Path)
    try {
        $hash = $algorithm.ComputeHash($stream)
    } finally {
        $stream.Dispose()
        $algorithm.Dispose()
    }
    $builder = New-Object System.Text.StringBuilder
    foreach ($byte in $hash) {
        $null = $builder.Append($byte.ToString('x2'))
    }
    return $builder.ToString().ToUpperInvariant()
}

function Test-Aria2FileSha256 {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][string]$Expected
    )
    $actual = Get-Aria2FileSha256 -Path $Path
    return [string]::Equals($actual, $Expected.Trim(), [System.StringComparison]::OrdinalIgnoreCase)
}

function New-Aria2InstallInfo {
    param(
        [string]$Version = $script:Aria2Version,
        [string]$Sha256 = '',
        [string]$InstallPath = '',
        [string]$InstalledAt = ''
    )
    if ([string]::IsNullOrWhiteSpace($InstalledAt)) {
        $InstalledAt = (Get-Date).ToUniversalTime().ToString('o', [System.Globalization.CultureInfo]::InvariantCulture)
    }
    $info = [ordered]@{
        version = $Version
        sha256 = $Sha256
        installPath = $InstallPath
        installedAt = $InstalledAt
    }
    return ,$info
}

function Read-Aria2InstallInfo {
    param([Parameter(Mandatory = $true)][string]$Path)
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return $null
    }
    try {
        $raw = Read-Aria2JsonFile -Path $Path
    } catch {
        return $null
    }
    if ($null -eq $raw) {
        return $null
    }
    $info = [ordered]@{
        version = ''
        sha256 = ''
        installPath = ''
        installedAt = ''
    }
    foreach ($key in @('version', 'sha256', 'installPath', 'installedAt')) {
        $property = $raw.PSObject.Properties[$key]
        if ($null -ne $property -and $null -ne $property.Value) {
            $info[$key] = [string]$property.Value
        }
    }
    if ([string]::IsNullOrWhiteSpace($info['installPath']) -and [string]::IsNullOrWhiteSpace($info['version'])) {
        return $null
    }
    return ,$info
}

function Save-Aria2InstallInfo {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)]$Info
    )
    Write-Aria2JsonFile -Path $Path -Value $Info
}

function Get-Aria2InstalledExePath {
    param([Parameter(Mandatory = $true)]$Paths)
    $info = Read-Aria2InstallInfo -Path $Paths.InstallFile
    if ($null -ne $info) {
        $installPath = [string]$info['installPath']
        if (-not [string]::IsNullOrWhiteSpace($installPath)) {
            $candidate = Join-Path $installPath 'aria2c.exe'
            if (Test-Path -LiteralPath $candidate -PathType Leaf) {
                return $candidate
            }
        }
    }
    if (Test-Path -LiteralPath $Paths.Aria2cExe -PathType Leaf) {
        return $Paths.Aria2cExe
    }
    return $null
}

function Find-Aria2ExistingExe {
    param([Parameter(Mandatory = $true)]$Paths)
    $installed = Get-Aria2InstalledExePath -Paths $Paths
    if ($null -ne $installed) {
        return $installed
    }
    $command = Get-Command -Name 'aria2c.exe' -CommandType Application -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($null -ne $command) {
        return [string]$command.Source
    }
    $candidates = New-Object 'System.Collections.Generic.List[string]'
    if (-not [string]::IsNullOrWhiteSpace($env:ProgramFiles)) {
        $candidates.Add((Join-Path $env:ProgramFiles 'aria2\aria2c.exe'))
    }
    $programFilesX86 = ${env:ProgramFiles(x86)}
    if (-not [string]::IsNullOrWhiteSpace($programFilesX86)) {
        $candidates.Add((Join-Path $programFilesX86 'aria2\aria2c.exe'))
    }
    if (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
        $candidates.Add((Join-Path $env:LOCALAPPDATA 'Programs\aria2\aria2c.exe'))
        $candidates.Add((Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\aria2c.exe'))
    }
    if (-not [string]::IsNullOrWhiteSpace($env:USERPROFILE)) {
        $candidates.Add((Join-Path $env:USERPROFILE 'aria2\aria2c.exe'))
        $candidates.Add((Join-Path $env:USERPROFILE 'scoop\shims\aria2c.exe'))
        $candidates.Add((Join-Path $env:USERPROFILE 'scoop\apps\aria2\current\aria2c.exe'))
    }
    if (-not [string]::IsNullOrWhiteSpace($env:ProgramData)) {
        $candidates.Add((Join-Path $env:ProgramData 'chocolatey\bin\aria2c.exe'))
        $candidates.Add((Join-Path $env:ProgramData 'chocolatey\lib\aria2\tools\aria2c.exe'))
    }
    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            return $candidate
        }
    }
    if (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
        $wingetPackages = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
        if (Test-Path -LiteralPath $wingetPackages -PathType Container) {
            foreach ($packageDir in @(Get-ChildItem -LiteralPath $wingetPackages -Directory -Filter 'aria2.aria2_*' -ErrorAction SilentlyContinue)) {
                $found = Get-ChildItem -LiteralPath $packageDir.FullName -Recurse -Filter 'aria2c.exe' -File -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($null -ne $found) {
                    return $found.FullName
                }
            }
        }
    }
    return $null
}

function Get-Aria2ExeVersion {
    param([Parameter(Mandatory = $true)][string]$ExePath)
    try {
        $output = & $ExePath --version 2>$null
        foreach ($line in @($output)) {
            $match = [regex]::Match([string]$line, 'aria2 version\s+(?<version>[0-9][0-9A-Za-z\.\-]*)')
            if ($match.Success) {
                return $match.Groups['version'].Value
            }
        }
    } catch {
    }
    return $script:Aria2Version
}

function Save-Aria2Package {
    param(
        [Parameter(Mandatory = $true)][string]$Destination,
        [string]$Url = $script:Aria2PackageUrl,
        [int]$TimeoutSeconds = 300
    )
    $directory = Split-Path -Parent $Destination
    if (-not [string]::IsNullOrEmpty($directory)) {
        $null = New-Aria2Directory -Path $directory
    }
    $previousProtocol = [System.Net.ServicePointManager]::SecurityProtocol
    try {
        [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12
        $request = [System.Net.HttpWebRequest]::Create($Url)
        $request.Method = 'GET'
        $request.UserAgent = 'aria2-raycast-engine/' + $script:Aria2Version
        $request.Timeout = $TimeoutSeconds * 1000
        $request.ReadWriteTimeout = $TimeoutSeconds * 1000
        $request.AllowAutoRedirect = $true
        $response = $request.GetResponse()
        try {
            $inputStream = $response.GetResponseStream()
            $outputStream = [System.IO.File]::Create($Destination)
            try {
                $inputStream.CopyTo($outputStream)
            } finally {
                $outputStream.Dispose()
                $inputStream.Dispose()
            }
        } finally {
            $response.Dispose()
        }
    } finally {
        [System.Net.ServicePointManager]::SecurityProtocol = $previousProtocol
    }
    return $Destination
}

function Expand-Aria2Package {
    param(
        [Parameter(Mandatory = $true)][string]$ZipPath,
        [Parameter(Mandatory = $true)][string]$TargetDir,
        [string]$ExpectedSha256 = ''
    )
    if (-not (Test-Path -LiteralPath $ZipPath -PathType Leaf)) {
        throw ('Package not found: ' + $ZipPath)
    }
    if (-not [string]::IsNullOrWhiteSpace($ExpectedSha256)) {
        if (-not (Test-Aria2FileSha256 -Path $ZipPath -Expected $ExpectedSha256)) {
            throw ('SHA-256 mismatch for package ' + $ZipPath + '.')
        }
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem -ErrorAction Stop
    $staging = Join-Path $env:TEMP ('aria2-package-' + [guid]::NewGuid().ToString('N'))
    try {
        $null = New-Aria2Directory -Path $staging
        [System.IO.Compression.ZipFile]::ExtractToDirectory($ZipPath, $staging)
        $packageExe = Get-ChildItem -Path $staging -Filter 'aria2c.exe' -Recurse -File -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($null -eq $packageExe) {
            throw 'aria2c.exe was not found inside the package.'
        }
        $sourceDir = Split-Path -Parent $packageExe.FullName
        $null = New-Aria2Directory -Path $TargetDir
        foreach ($item in @(Get-ChildItem -LiteralPath $sourceDir -Force)) {
            $destination = Join-Path $TargetDir $item.Name
            Copy-Item -LiteralPath $item.FullName -Destination $destination -Recurse -Force -ErrorAction Stop
        }
        $targetExe = Join-Path $TargetDir 'aria2c.exe'
        if (-not (Test-Path -LiteralPath $targetExe -PathType Leaf)) {
            throw 'Failed to install aria2c.exe into the engine directory.'
        }
        try {
            Unblock-File -LiteralPath $targetExe -ErrorAction SilentlyContinue
        } catch {
        }
        return $targetExe
    } finally {
        if (Test-Path -LiteralPath $staging) {
            Remove-Item -LiteralPath $staging -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
}

# ---------------------------------------------------------------------------
# Runtime configuration
# ---------------------------------------------------------------------------

function Format-Aria2Boolean {
    param([bool]$Value)
    if ($Value) {
        return 'true'
    }
    return 'false'
}

function Format-Aria2SeedRatio {
    param([double]$Value)
    return $Value.ToString('0.0#####', [System.Globalization.CultureInfo]::InvariantCulture)
}

function Get-Aria2HookCommand {
    param(
        [Parameter(Mandatory = $true)]$Paths,
        [Parameter(Mandatory = $true)][ValidateSet('download', 'bt', 'error')][string]$EventName
    )
    if (-not (Test-Path -LiteralPath $Paths.HookScript -PathType Leaf)) {
        throw ('Hook script not found: ' + $Paths.HookScript)
    }
    $wscript = 'wscript.exe'
    if (-not [string]::IsNullOrWhiteSpace($env:SystemRoot)) {
        $candidate = Join-Path $env:SystemRoot 'System32\wscript.exe'
        if (Test-Path -LiteralPath $candidate -PathType Leaf) {
            $wscript = $candidate
        }
    }
    $wscriptArg = $wscript
    if ($wscriptArg -match '\s') {
        $wscriptArg = '"' + $wscriptArg + '"'
    }
    return ($wscriptArg + ' //nologo "' + $Paths.HookScript + '" ' + $EventName)
}

function Get-Aria2RuntimeConfTokens {
    param(
        [Parameter(Mandatory = $true)]$Settings,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Secret,
        [Parameter(Mandatory = $true)]$Paths
    )
    if ([string]::IsNullOrEmpty($Secret) -or $Secret.IndexOf("`r") -ge 0 -or $Secret.IndexOf("`n") -ge 0) {
        throw 'RPC secret must be a non-empty single-line string.'
    }
    $proxyMode = [string]$Settings['proxyMode']
    $allProxy = ''
    $noProxy = ''
    if ($proxyMode -eq 'custom') {
        $allProxy = [string]$Settings['allProxy']
        $noProxy = [string]$Settings['noProxy']
    }
    # aria2's Windows event hooks are unreliable (CreateProcess failures on
    # some builds), so the engine uses Watch-Aria2.ps1 for notifications and
    # intentionally leaves the hook options empty.
    $hookDownload = ''
    $hookBt = ''
    $hookError = ''
    $tokens = @{
        DIR = [string]$Settings['downloadDir']
        SPLIT = (ConvertTo-Aria2InvariantString -Value ([int]$Settings['split']))
        MAX_CONN_PER_SERVER = (ConvertTo-Aria2InvariantString -Value ([int]$Settings['connections']))
        MIN_SPLIT_SIZE = [string]$Settings['minSplitSize']
        MAX_CONCURRENT_DOWNLOADS = (ConvertTo-Aria2InvariantString -Value ([int]$Settings['maxConcurrentDownloads']))
        FILE_ALLOCATION = [string]$Settings['fileAllocation']
        DISK_CACHE = [string]$Settings['diskCache']
        MAX_OVERALL_DOWNLOAD_LIMIT = [string]$Settings['maxOverallDownloadLimit']
        MAX_OVERALL_UPLOAD_LIMIT = [string]$Settings['maxOverallUploadLimit']
        CONNECT_TIMEOUT = (ConvertTo-Aria2InvariantString -Value ([int]$Settings['connectTimeout']))
        TIMEOUT = (ConvertTo-Aria2InvariantString -Value ([int]$Settings['timeout']))
        MAX_TRIES = (ConvertTo-Aria2InvariantString -Value ([int]$Settings['maxTries']))
        RETRY_WAIT = (ConvertTo-Aria2InvariantString -Value ([int]$Settings['retryWait']))
        LOWEST_SPEED_LIMIT = [string]$Settings['lowestSpeedLimit']
        LISTEN_PORT = (ConvertTo-Aria2InvariantString -Value ([int]$Settings['listenPort']))
        DHT_LISTEN_PORT = (ConvertTo-Aria2InvariantString -Value ([int]$Settings['dhtListenPort']))
        ENABLE_DHT = (Format-Aria2Boolean -Value ([bool]$Settings['enableDht']))
        ENABLE_PEER_EXCHANGE = (Format-Aria2Boolean -Value ([bool]$Settings['enablePeerExchange']))
        BT_ENABLE_LPD = (Format-Aria2Boolean -Value ([bool]$Settings['btEnableLpd']))
        BT_MAX_PEERS = (ConvertTo-Aria2InvariantString -Value ([int]$Settings['btMaxPeers']))
        BT_REQUIRE_CRYPTO = (Format-Aria2Boolean -Value ([bool]$Settings['btRequireCrypto']))
        SEED_TIME = (ConvertTo-Aria2InvariantString -Value ([int]$Settings['seedTime']))
        SEED_RATIO = (Format-Aria2SeedRatio -Value ([double]$Settings['seedRatio']))
        BT_SAVE_METADATA = (Format-Aria2Boolean -Value ([bool]$Settings['btSaveMetadata']))
        BT_LOAD_SAVED_METADATA = (Format-Aria2Boolean -Value ([bool]$Settings['btLoadSavedMetadata']))
        RPC_SAVE_UPLOAD_METADATA = (Format-Aria2Boolean -Value ([bool]$Settings['rpcSaveUploadMetadata']))
        BT_TRACKER = [string]$Settings['btTracker']
        SAVE_SESSION = [string]$Paths.SessionFile
        SAVE_SESSION_INTERVAL = (ConvertTo-Aria2InvariantString -Value ([int]$Settings['saveSessionInterval']))
        LOG = [string]$Paths.Aria2LogFile
        RPC_PORT = (ConvertTo-Aria2InvariantString -Value ([int]$Settings['rpcPort']))
        RPC_SECRET = $Secret
        CHECK_CERTIFICATE = (Format-Aria2Boolean -Value ([bool]$Settings['checkCertificate']))
        ALL_PROXY = $allProxy
        NO_PROXY = $noProxy
        HOOK_DOWNLOAD = $hookDownload
        HOOK_BT = $hookBt
        HOOK_ERROR = $hookError
    }
    return $tokens
}

function New-Aria2RuntimeConf {
    param(
        [Parameter(Mandatory = $true)]$Settings,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Secret,
        [Parameter(Mandatory = $true)]$Paths,
        [string]$TemplatePath = '',
        [string]$ConfPath = ''
    )
    if ([string]::IsNullOrWhiteSpace($TemplatePath)) {
        $TemplatePath = $Paths.TemplateFile
    }
    if ([string]::IsNullOrWhiteSpace($ConfPath)) {
        $ConfPath = $Paths.RuntimeConfFile
    }
    if (-not (Test-Path -LiteralPath $TemplatePath -PathType Leaf)) {
        throw ('Config template not found: ' + $TemplatePath)
    }
    $tokens = Get-Aria2RuntimeConfTokens -Settings $Settings -Secret $Secret -Paths $Paths
    $template = Read-Aria2Utf8Text -Path $TemplatePath
    $templateLines = $template -split "`r?`n"
    $outputLines = New-Object 'System.Collections.Generic.List[string]'
    $outputLines.Add('# Generated by Aria2Common.ps1 (aria2-raycast engine). Do not edit.')
    $outputLines.Add('# aria2 version: ' + $script:Aria2Version)
    $outputLines.Add('# Change settings through Set-Aria2Settings.ps1 instead of editing this file.')
    $outputLines.Add('')
    foreach ($templateLine in $templateLines) {
        $line = $templateLine
        $conditional = $false
        if ($line.StartsWith('#?')) {
            $conditional = $true
            $line = $line.Substring(2).TrimStart()
        }
        $tokenMatches = [regex]::Matches($line, '\{\{(?<name>[A-Z0-9_]+)\}\}')
        if ($conditional) {
            $skip = $false
            foreach ($match in $tokenMatches) {
                $tokenName = $match.Groups['name'].Value
                if (-not $tokens.ContainsKey($tokenName)) {
                    throw ('Unknown template placeholder: ' + $tokenName)
                }
                if ([string]::IsNullOrEmpty([string]$tokens[$tokenName])) {
                    $skip = $true
                    break
                }
            }
            if ($skip) {
                continue
            }
        }
        foreach ($match in $tokenMatches) {
            $tokenName = $match.Groups['name'].Value
            if (-not $tokens.ContainsKey($tokenName)) {
                throw ('Unknown template placeholder: ' + $tokenName)
            }
            $tokenValue = [string]$tokens[$tokenName]
            if ($tokenValue.IndexOf("`r") -ge 0 -or $tokenValue.IndexOf("`n") -ge 0) {
                throw ('Value for placeholder ' + $tokenName + ' must be single-line.')
            }
            $line = $line.Replace('{{' + $tokenName + '}}', $tokenValue)
        }
        if ([regex]::IsMatch($line, '\{\{[A-Z0-9_]+\}\}')) {
            throw ('Unresolved placeholder in runtime configuration: ' + $line)
        }
        $outputLines.Add($line.TrimEnd())
    }
    $content = ($outputLines -join "`r`n") + "`r`n"
    Write-Aria2Utf8TextAtomic -Path $ConfPath -Content $content
    return $ConfPath
}

function Get-Aria2StartArguments {
    param(
        [Parameter(Mandatory = $true)]$Paths,
        [Parameter(Mandatory = $true)]$Settings
    )
    $arguments = '--conf-path="' + $Paths.RuntimeConfFile + '"'
    if ([string]$Settings['proxyMode'] -eq 'direct') {
        # Direct mode explicitly disables proxies that may be inherited from the
        # environment; the empty value must be passed on the aria2 command line.
        $arguments = $arguments + ' --all-proxy='
    }
    if (Test-Path -LiteralPath $Paths.SessionFile -PathType Leaf) {
        try {
            $sessionItem = Get-Item -LiteralPath $Paths.SessionFile -Force
            if ($sessionItem.Length -gt 0) {
                $arguments = $arguments + ' --input-file="' + $Paths.SessionFile + '"'
            }
        } catch {
        }
    }
    return $arguments
}

# ---------------------------------------------------------------------------
# RPC client
# ---------------------------------------------------------------------------

function Invoke-Aria2Rpc {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [string]$Secret = '',
        [Parameter(Mandatory = $true)][string]$Method,
        [object[]]$Parameters = @(),
        [int]$TimeoutMs = 5000
    )
    if ($Port -lt 1 -or $Port -gt 65535) {
        throw ('Invalid RPC port: ' + $Port)
    }
    if ([string]::IsNullOrEmpty($Method)) {
        throw 'RPC method must not be empty.'
    }
    $calls = New-Object 'System.Collections.Generic.List[object]'
    $calls.Add('token:' + $Secret)
    if ($null -ne $Parameters) {
        foreach ($parameter in $Parameters) {
            $calls.Add($parameter)
        }
    }
    $payload = [ordered]@{
        jsonrpc = '2.0'
        id = 'aria2-raycast-engine'
        method = $Method
        params = $calls
    }
    $body = ConvertTo-Aria2Json -Value $payload -Compress
    $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($body)
    $uri = 'http://127.0.0.1:' + (ConvertTo-Aria2InvariantString -Value $Port) + '/jsonrpc'
    $request = [System.Net.HttpWebRequest]::Create($uri)
    $request.Method = 'POST'
    $request.ContentType = 'application/json'
    $request.UserAgent = 'aria2-raycast-engine/' + $script:Aria2Version
    $request.Timeout = $TimeoutMs
    $request.ReadWriteTimeout = $TimeoutMs
    $request.Proxy = $null
    try {
        $requestStream = $request.GetRequestStream()
        try {
            $requestStream.Write($bodyBytes, 0, $bodyBytes.Length)
        } finally {
            $requestStream.Dispose()
        }
        $response = $request.GetResponse()
        try {
            $reader = New-Object System.IO.StreamReader($response.GetResponseStream(), [System.Text.Encoding]::UTF8)
            try {
                $responseText = $reader.ReadToEnd()
            } finally {
                $reader.Dispose()
            }
        } finally {
            $response.Dispose()
        }
    } catch [System.Net.WebException] {
        $message = 'RPC request failed'
        try {
            if ($null -ne $_.Exception.Response) {
                $message = $message + ' (HTTP ' + [int]$_.Exception.Response.StatusCode + ')'
            }
        } catch {
        }
        throw $message
    }
    $parsed = $null
    try {
        $parsed = $responseText | ConvertFrom-Json
    } catch {
        throw 'RPC response was not valid JSON.'
    }
    $errorProperty = $parsed.PSObject.Properties['error']
    if ($null -ne $errorProperty -and $null -ne $errorProperty.Value) {
        $errorCode = ''
        $errorMessage = ''
        try {
            $errorCode = ConvertTo-Aria2InvariantString -Value $errorProperty.Value.code
            $errorMessage = [string]$errorProperty.Value.message
        } catch {
        }
        throw ('RPC error ' + $errorCode + ': ' + $errorMessage)
    }
    $resultProperty = $parsed.PSObject.Properties['result']
    if ($null -ne $resultProperty) {
        return $resultProperty.Value
    }
    return $null
}

function Test-Aria2RpcAvailable {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [string]$Secret = '',
        [int]$TimeoutMs = 1500
    )
    try {
        $null = Invoke-Aria2Rpc -Port $Port -Secret $Secret -Method 'aria2.getVersion' -TimeoutMs $TimeoutMs
        return $true
    } catch {
        return $false
    }
}

function Wait-Aria2RpcReady {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [string]$Secret = '',
        [int]$TimeoutSeconds = 20,
        $Process = $null
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if ($null -ne $Process) {
            try {
                if ($Process.HasExited) {
                    return $false
                }
            } catch {
            }
        }
        if (Test-Aria2RpcAvailable -Port $Port -Secret $Secret -TimeoutMs 1200) {
            return $true
        }
        Start-Sleep -Milliseconds 400
    }
    return $false
}

function Wait-Aria2RpcDown {
    param(
        [Parameter(Mandatory = $true)][int]$Port,
        [string]$Secret = '',
        [int]$TimeoutSeconds = 20
    )
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    while ((Get-Date) -lt $deadline) {
        if (-not (Test-Aria2RpcAvailable -Port $Port -Secret $Secret -TimeoutMs 1000)) {
            return $true
        }
        Start-Sleep -Milliseconds 300
    }
    return $false
}

# ---------------------------------------------------------------------------
# Processes
# ---------------------------------------------------------------------------

function Get-Aria2RunningProcessIds {
    param([Parameter(Mandatory = $true)]$Paths)
    $ids = New-Object 'System.Collections.Generic.List[int]'
    $usedCim = $false
    try {
        $processes = @(Get-CimInstance -ClassName Win32_Process -Filter "Name='aria2c.exe'" -ErrorAction Stop)
        $usedCim = $true
        foreach ($process in $processes) {
            $commandLine = ''
            if ($null -ne $process.CommandLine) {
                $commandLine = [string]$process.CommandLine
            }
            if ($commandLine.Length -eq 0) {
                $ids.Add([int]$process.ProcessId)
                continue
            }
            $hasConfArgument = $commandLine.IndexOf('--conf-path=', [System.StringComparison]::OrdinalIgnoreCase) -ge 0
            $hasOurConf = $commandLine.IndexOf($Paths.RuntimeConfFile, [System.StringComparison]::OrdinalIgnoreCase) -ge 0
            if ($hasConfArgument -and $hasOurConf) {
                $ids.Add([int]$process.ProcessId)
            }
        }
    } catch {
        $usedCim = $false
    }
    if (-not $usedCim) {
        try {
            $installedExe = Get-Aria2InstalledExePath -Paths $Paths
            foreach ($process in @(Get-Process -Name 'aria2c' -ErrorAction SilentlyContinue)) {
                try {
                    if (-not [string]::IsNullOrEmpty($installedExe) -and -not [string]::IsNullOrEmpty($process.Path) -and [string]::Equals($process.Path, $installedExe, [System.StringComparison]::OrdinalIgnoreCase)) {
                        $ids.Add([int]$process.Id)
                    }
                } catch {
                }
            }
        } catch {
        }
    }
    return [pscustomobject]@{
        Ids = $ids.ToArray()
        Count = $ids.Count
    }
}

function Stop-Aria2ProcessById {
    param([Parameter(Mandatory = $true)][int]$ProcessId)
    try {
        Stop-Process -Id $ProcessId -Force -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

# ---------------------------------------------------------------------------
# Logging, redaction and toast notifications
# ---------------------------------------------------------------------------

function Protect-Aria2Text {
    param([string]$Text = '', [string]$Secret = '')
    if ($null -eq $Text) {
        return ''
    }
    $result = $Text
    if (-not [string]::IsNullOrEmpty($Secret)) {
        $result = $result.Replace($Secret, '***')
    }
    $result = [regex]::Replace($result, 'token:[^\s"'']+', 'token:***')
    return $result
}

function Write-Aria2EngineLog {
    param(
        [Parameter(Mandatory = $true)]$Paths,
        [Parameter(Mandatory = $true)][string]$Message,
        [string]$Level = 'INFO',
        [string]$Secret = ''
    )
    try {
        $directory = Split-Path -Parent $Paths.RpcLogFile
        if (-not [string]::IsNullOrEmpty($directory)) {
            $null = New-Aria2Directory -Path $directory
        }
        $safeMessage = Protect-Aria2Text -Text $Message -Secret $Secret
        $line = '[' + (Get-Date).ToString('yyyy-MM-dd HH:mm:ss.fff', [System.Globalization.CultureInfo]::InvariantCulture) + '] [' + $Level + '] ' + $safeMessage
        $builder = New-Object System.Text.StringBuilder
        $null = $builder.Append($line).Append("`r`n")
        [System.IO.File]::AppendAllText($Paths.RpcLogFile, $builder.ToString(), (New-Object System.Text.UTF8Encoding($false)))
    } catch {
    }
}

function Get-Aria2LogTail {
    param([string]$Path, [int]$Lines = 20)
    if ([string]::IsNullOrWhiteSpace($Path) -or -not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return ''
    }
    try {
        $content = Read-Aria2Utf8Text -Path $Path
        $allLines = $content -split "`r?`n"
        $tail = $allLines | Select-Object -Last $Lines
        return ($tail -join [Environment]::NewLine)
    } catch {
        return ''
    }
}

function Show-Aria2Toast {
    param(
        [Parameter(Mandatory = $true)][string]$Title,
        [string]$Message = ''
    )
    $safeTitle = $Title
    if ([string]::IsNullOrWhiteSpace($safeTitle)) {
        $safeTitle = 'aria2'
    }
    if ($safeTitle.Length -gt 64) {
        $safeTitle = $safeTitle.Substring(0, 61) + '...'
    }
    $safeMessage = $Message
    if ($null -eq $safeMessage) {
        $safeMessage = ''
    }
    if ($safeMessage.Length -gt 240) {
        $safeMessage = $safeMessage.Substring(0, 237) + '...'
    }
    try {
        $null = [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime]
        $null = [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime]
        $escapedTitle = [System.Security.SecurityElement]::Escape($safeTitle)
        $escapedMessage = [System.Security.SecurityElement]::Escape($safeMessage)
        $xmlText = '<toast duration="short"><visual><binding template="ToastGeneric"><text>' + $escapedTitle + '</text><text>' + $escapedMessage + '</text></binding></visual><audio silent="true"/></toast>'
        $document = New-Object Windows.Data.Xml.Dom.XmlDocument
        $document.LoadXml($xmlText)
        $toast = New-Object Windows.UI.Notifications.ToastNotification $document
        $appIds = @(
            '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe',
            'aria2-download-raycast'
        )
        foreach ($appId in $appIds) {
            try {
                $notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId)
                $notifier.Show($toast)
                return $true
            } catch {
            }
        }
    } catch {
    }
    return $false
}

function Show-Aria2ToastIfEnabled {
    param(
        [switch]$NoToast,
        [Parameter(Mandatory = $true)][string]$Title,
        [string]$Message = ''
    )
    if ($NoToast) {
        return $false
    }
    return (Show-Aria2Toast -Title $Title -Message $Message)
}

# ---------------------------------------------------------------------------
# Notification dedupe markers
# ---------------------------------------------------------------------------

function Get-Aria2NotifiedMarkerPath {
    param(
        [Parameter(Mandatory = $true)]$Paths,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Gid
    )
    if ([string]::IsNullOrWhiteSpace($Gid)) {
        throw 'GID is empty.'
    }
    $normalized = $Gid.Trim().ToLowerInvariant()
    if (-not [regex]::IsMatch($normalized, '^[0-9a-f]{16}$')) {
        throw ('Invalid GID: ' + $Gid)
    }
    return (Join-Path $Paths.NotifiedDir ($normalized + '.json'))
}

function Set-Aria2Notified {
    param(
        [Parameter(Mandatory = $true)]$Paths,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Gid,
        [Parameter(Mandatory = $true)][string]$EventName
    )
    $markerPath = Get-Aria2NotifiedMarkerPath -Paths $Paths -Gid $Gid
    $null = New-Aria2Directory -Path $Paths.NotifiedDir
    $marker = [ordered]@{
        gid = $Gid.Trim().ToLowerInvariant()
        event = $EventName
        at = (Get-Date).ToUniversalTime().ToString('o', [System.Globalization.CultureInfo]::InvariantCulture)
    }
    Write-Aria2JsonFile -Path $markerPath -Value $marker
    return $markerPath
}

function Get-Aria2NotifiedMarker {
    param(
        [Parameter(Mandatory = $true)]$Paths,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Gid
    )
    try {
        $markerPath = Get-Aria2NotifiedMarkerPath -Paths $Paths -Gid $Gid
    } catch {
        return $null
    }
    if (-not (Test-Path -LiteralPath $markerPath -PathType Leaf)) {
        return $null
    }
    try {
        $raw = Read-Aria2JsonFile -Path $markerPath
    } catch {
        return $null
    }
    $eventName = ''
    $property = $raw.PSObject.Properties['event']
    if ($null -ne $property -and $null -ne $property.Value) {
        $eventName = [string]$property.Value
    }
    return [pscustomobject]@{
        Gid = $Gid.Trim().ToLowerInvariant()
        Event = $eventName
        Path = $markerPath
    }
}

function Test-Aria2ShouldSuppressDownloadNotification {
    param(
        [Parameter(Mandatory = $true)]$Paths,
        [Parameter(Mandatory = $true)][AllowEmptyString()][string]$Gid
    )
    $marker = Get-Aria2NotifiedMarker -Paths $Paths -Gid $Gid
    if ($null -eq $marker) {
        return $false
    }
    return ($marker.Event -eq 'bt')
}

function Remove-Aria2StaleNotified {
    param(
        [Parameter(Mandatory = $true)]$Paths,
        [int]$Days = 7
    )
    if (-not (Test-Path -LiteralPath $Paths.NotifiedDir -PathType Container)) {
        return 0
    }
    $cutoff = (Get-Date).AddDays(-1 * $Days)
    $removed = 0
    foreach ($file in @(Get-ChildItem -LiteralPath $Paths.NotifiedDir -Filter '*.json' -File -ErrorAction SilentlyContinue)) {
        if ($file.LastWriteTime -lt $cutoff) {
            try {
                Remove-Item -LiteralPath $file.FullName -Force -ErrorAction Stop
                $removed = $removed + 1
            } catch {
            }
        }
    }
    return $removed
}

# ---------------------------------------------------------------------------
# aria2 status helpers (used by Notify-Aria2.ps1)
# ---------------------------------------------------------------------------

function Test-Aria2StatusHasProperty {
    param($Status, [string]$Name)
    if ($null -eq $Status) {
        return $false
    }
    $property = $Status.PSObject.Properties[$Name]
    return ($null -ne $property -and $null -ne $property.Value)
}

function Get-Aria2StatusString {
    param($Status, [string]$Name)
    if ($null -eq $Status) {
        return ''
    }
    $property = $Status.PSObject.Properties[$Name]
    if ($null -eq $property -or $null -eq $property.Value) {
        return ''
    }
    return [string]$property.Value
}

function Get-Aria2StatusNumber {
    param($Status, [string]$Name)
    $text = Get-Aria2StatusString -Status $Status -Name $Name
    if ([string]::IsNullOrWhiteSpace($text)) {
        return 0.0
    }
    $parsed = 0.0
    if ([double]::TryParse($text.Trim(), [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$parsed)) {
        return $parsed
    }
    return 0.0
}

function Test-Aria2StatusIsBitTorrent {
    param($Status)
    return (Test-Aria2StatusHasProperty -Status $Status -Name 'bittorrent')
}

function Get-Aria2TaskName {
    param($Status, [string]$FallbackPath = '')
    $name = ''
    if ($null -ne $Status) {
        if (Test-Aria2StatusHasProperty -Status $Status -Name 'bittorrent') {
            $bittorrent = $Status.PSObject.Properties['bittorrent'].Value
            if (Test-Aria2StatusHasProperty -Status $bittorrent -Name 'info') {
                $info = $bittorrent.PSObject.Properties['info'].Value
                if (Test-Aria2StatusHasProperty -Status $info -Name 'name') {
                    $name = [string]$info.PSObject.Properties['name'].Value
                }
            }
        }
        if ([string]::IsNullOrWhiteSpace($name) -and (Test-Aria2StatusHasProperty -Status $Status -Name 'files')) {
            $files = @($Status.PSObject.Properties['files'].Value)
            if ($files.Count -gt 0 -and $null -ne $files[0]) {
                $pathValue = Get-Aria2StatusString -Status $files[0] -Name 'path'
                if (-not [string]::IsNullOrWhiteSpace($pathValue)) {
                    $name = Split-Path -Leaf $pathValue
                }
            }
        }
    }
    if ([string]::IsNullOrWhiteSpace($name) -and -not [string]::IsNullOrWhiteSpace($FallbackPath)) {
        try {
            $leaf = Split-Path -Leaf $FallbackPath
            if (-not [string]::IsNullOrWhiteSpace($leaf)) {
                $name = $leaf
            }
        } catch {
        }
    }
    if ([string]::IsNullOrWhiteSpace($name)) {
        $name = 'aria2 download'
    }
    $name = $name.Trim()
    if ($name.Length -gt 120) {
        $name = $name.Substring(0, 117) + '...'
    }
    return $name
}

function Format-Aria2ByteSize {
    param($Bytes)
    $value = 0.0
    if ($Bytes -is [string]) {
        if (-not [double]::TryParse($Bytes.Trim(), [System.Globalization.NumberStyles]::Float, [System.Globalization.CultureInfo]::InvariantCulture, [ref]$value)) {
            return ''
        }
    } else {
        try {
            $value = [double]$Bytes
        } catch {
            return ''
        }
    }
    if ($value -lt 0 -or [double]::IsNaN($value) -or [double]::IsInfinity($value)) {
        return ''
    }
    if ($value -ge 1073741824) {
        return ($value / 1073741824.0).ToString('0.00', [System.Globalization.CultureInfo]::InvariantCulture) + ' GB'
    }
    if ($value -ge 1048576) {
        return ($value / 1048576.0).ToString('0.00', [System.Globalization.CultureInfo]::InvariantCulture) + ' MB'
    }
    if ($value -ge 1024) {
        return ($value / 1024.0).ToString('0.0', [System.Globalization.CultureInfo]::InvariantCulture) + ' KB'
    }
    return ([math]::Round($value)).ToString([System.Globalization.CultureInfo]::InvariantCulture) + ' B'
}

# ---------------------------------------------------------------------------
# Completion watcher lifecycle
# ---------------------------------------------------------------------------

function Get-Aria2WatcherProcessId {
    param([Parameter(Mandatory = $true)]$Paths)
    if (-not (Test-Path -LiteralPath $Paths.WatchPidFile -PathType Leaf)) {
        return 0
    }
    $pidText = ''
    try {
        $pidText = (Get-Content -LiteralPath $Paths.WatchPidFile -Raw -ErrorAction Stop).Trim()
    } catch {
        $pidText = ''
    }
    $watcherId = 0
    if (-not [int]::TryParse($pidText, [ref]$watcherId) -or $watcherId -le 0) {
        Remove-Item -LiteralPath $Paths.WatchPidFile -Force -ErrorAction SilentlyContinue
        return 0
    }
    $process = Get-Process -Id $watcherId -ErrorAction SilentlyContinue
    if ($null -eq $process) {
        Remove-Item -LiteralPath $Paths.WatchPidFile -Force -ErrorAction SilentlyContinue
        return 0
    }
    if ($process.ProcessName -ne 'powershell') {
        Remove-Item -LiteralPath $Paths.WatchPidFile -Force -ErrorAction SilentlyContinue
        return 0
    }
    try {
        $cim = Get-CimInstance Win32_Process -Filter ('ProcessId = ' + $watcherId) -ErrorAction Stop
        if ($null -ne $cim -and $null -ne $cim.CommandLine -and $cim.CommandLine -notmatch 'Watch-Aria2\.ps1') {
            Remove-Item -LiteralPath $Paths.WatchPidFile -Force -ErrorAction SilentlyContinue
            return 0
        }
    } catch {
        # If CIM is unavailable, keep the process: the pid file is ours.
    }
    return $watcherId
}

function Stop-Aria2Watcher {
    param([Parameter(Mandatory = $true)]$Paths)
    $watcherId = Get-Aria2WatcherProcessId -Paths $Paths
    if ($watcherId -gt 0) {
        try {
            Stop-Process -Id $watcherId -Force -ErrorAction Stop
        } catch {
        }
    }
    Remove-Item -LiteralPath $Paths.WatchPidFile -Force -ErrorAction SilentlyContinue
}

function Start-Aria2Watcher {
    param(
        [Parameter(Mandatory = $true)]$Paths,
        [switch]$NoToast
    )
    try {
        $settings = $null
        if (Test-Path -LiteralPath $Paths.SettingsFile -PathType Leaf) {
            $settings = Read-Aria2Settings -Path $Paths.SettingsFile
        }
        if ($null -eq $settings) {
            $settings = Get-Aria2DefaultSettings
        }
        $notificationsEnabled = [bool]$settings['notifications']
        $autoStopWhenIdle = [bool]$settings['autoStopWhenIdle']
        if (-not $notificationsEnabled -and -not $autoStopWhenIdle) {
            Stop-Aria2Watcher -Paths $Paths
            return $false
        }
        if (-not (Test-Path -LiteralPath $Paths.WatchScript -PathType Leaf)) {
            Write-Aria2EngineLog -Paths $Paths -Message 'watch: script missing; completion notifications disabled' -Level 'ERROR'
            return $false
        }
        $existing = Get-Aria2WatcherProcessId -Paths $Paths
        if ($existing -gt 0) {
            return $true
        }

        # Mark stopped tasks that already existed before the watcher starts.
        # Tasks that finish after this snapshot remain unmarked and are notified
        # by the watcher's first poll, even if they finish very quickly.
        try {
            $port = [int]$settings['rpcPort']
            $secret = ''
            if (Test-Path -LiteralPath $Paths.SecretFile -PathType Leaf) {
                $secret = Get-Aria2Secret -Path $Paths.SecretFile
            }
            $initialStopped = @(Invoke-Aria2Rpc -Port $port -Secret $secret -Method 'aria2.tellStopped' -Parameters @(0, 200) -TimeoutMs 3000)
            foreach ($initialTask in $initialStopped) {
                $initialGid = Get-Aria2StatusString -Status $initialTask -Name 'gid'
                $initialStatus = Get-Aria2StatusString -Status $initialTask -Name 'status'
                if (-not [string]::IsNullOrWhiteSpace($initialGid) -and ($initialStatus -eq 'complete' -or $initialStatus -eq 'error')) {
                    try {
                        $null = Set-Aria2Notified -Paths $Paths -Gid $initialGid -EventName 'baseline'
                    } catch {
                    }
                }
            }
        } catch {
            # If the snapshot fails, the watcher will notify unmarked tasks.
        }

        $powerShell = 'powershell.exe'
        if (-not [string]::IsNullOrWhiteSpace($env:SystemRoot)) {
            $candidate = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
            if (Test-Path -LiteralPath $candidate -PathType Leaf) {
                $powerShell = $candidate
            }
        }
        $arguments = @(
            '-NoLogo', '-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass',
            '-WindowStyle', 'Hidden',
            '-File', ('"' + $Paths.WatchScript + '"'),
            '-IntervalSeconds', '3'
        )
        if ($NoToast) {
            $arguments += '-NoToast'
        }
        $process = Start-Process -FilePath $powerShell -ArgumentList $arguments -WindowStyle Hidden -PassThru -ErrorAction Stop
        Set-Content -LiteralPath $Paths.WatchPidFile -Value ([string]$process.Id) -Encoding ASCII -Force
        Write-Aria2EngineLog -Paths $Paths -Message ('watch: started pid=' + $process.Id)
        return $true
    } catch {
        Write-Aria2EngineLog -Paths $Paths -Message ('watch: start failed: ' + (Get-Aria2ErrorMessage -ErrorRecord $_)) -Level 'ERROR'
        return $false
    }
}
