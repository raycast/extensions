$basePath = "HKCU:\Software\Microsoft\Office"

$groups = @{}

$appPaths = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\POWERPNT.EXE",
            "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\POWERPNT.EXE"

$pptPath = $null
foreach ($k in $appPaths) {
    if (Test-Path $k) {
        $pptPath = (Get-ItemProperty -Path $k -Name '(default)' -ErrorAction SilentlyContinue).'(default)'
        break
    }
}

$appPaths = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\Winword.exe",
            "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\Winword.exe"

$wordPath = $null
foreach ($k in $appPaths) {
    if (Test-Path $k) {
        $wordPath = (Get-ItemProperty -Path $k -Name '(default)' -ErrorAction SilentlyContinue).'(default)'
        break
    }
}

$appPaths = "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\excel.exe",
            "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\App Paths\excel.exe"

$excelPath = $null
foreach ($k in $appPaths) {
    if (Test-Path $k) {
        $excelPath = (Get-ItemProperty -Path $k -Name '(default)' -ErrorAction SilentlyContinue).'(default)'
        break
    }
}

Get-ChildItem $basePath -Recurse -ErrorAction SilentlyContinue |
Where-Object { $_.PSChildName -eq "File MRU" -and $_.PSPath -match "ADAL" } |
ForEach-Object {

    $keyPath = $_.PSPath

    # Extract Office version, app, and ADAL container name
    if ($keyPath -match 'Office\\([^\\]+)\\([^\\]+)\\User MRU\\([^\\]+)\\File MRU') {
        $officeVersion = $matches[1]
        $application   = $matches[2]
        $adalContainer = $matches[3]
    } else {
        return
    }

    if (-not $groups.ContainsKey($adalContainer)) {
        $groups[$adalContainer] = [ordered]@{
            OfficeVersion = $officeVersion
            Application   = $application
            Folders       = @()
            Files         = @()
            PPTPath       = $pptPath
            WORDPath      = $wordPath
            EXCELPath     = $excelPath
        }
    }

    $values = Get-ItemProperty $keyPath

    foreach ($prop in $values.PSObject.Properties) {

        if ($prop.Name -match "^PS") { continue }

        # Folder entries
        if ($prop.Name -like "FOLDERID_*") {
            $groups[$adalContainer].Folders += [PSCustomObject]@{
                Name     = $prop.Name
                Path     = $prop.Value
            }
            continue
        }

        # File MRU entries
        if ($prop.Value -match '^\[F[0-9A-F]+\]\[T([0-9A-F]+)\]\[O[0-9A-F]+\]\*(.+)$') {

            $hexTime = $matches[1]
            $file    = $matches[2]

            try {
                $fileTime = [Int64]::Parse($hexTime, [System.Globalization.NumberStyles]::HexNumber)
                $timestamp = [DateTime]::FromFileTimeUtc($fileTime)
            } catch {
                $timestamp = $null
            }

            $groups[$adalContainer].Files += [PSCustomObject]@{
                ItemName     = $prop.Name
                FilePath     = $file
                TimestampUTC = $timestamp
                RawValue     = $prop.Value
            }
        }
    }
}

# Convert grouped structure to JSON
$groups | ConvertTo-Json -Depth 6
