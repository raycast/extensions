#requires -Version 5.1
param(
    [switch]$RequireOcr
)

Set-StrictMode -Version 2.0
$ErrorActionPreference = 'Stop'

if ($PSVersionTable.PSEdition -ne 'Desktop') {
    [Console]::Error.WriteLine('Run this test with Windows PowerShell 5.1 (powershell.exe), not pwsh.')
    exit 1
}

$helperPath = Join-Path (Split-Path -Parent $PSScriptRoot) 'assets\ocr.ps1'
$script:Passed = 0
$script:Failed = 0
$script:Skipped = 0
$script:CurrentSkipReason = $null

function Assert-True {
    param([bool]$Condition, [string]$Message)
    if (-not $Condition) { throw $Message }
}

function Assert-Equal {
    param($Actual, $Expected, [string]$Message)
    if (-not [object]::Equals($Actual, $Expected)) {
        throw "$Message Expected <$Expected>, received <$Actual>."
    }
}

function Skip-CurrentTest {
    param([string]$Reason)
    $script:CurrentSkipReason = $Reason
}

function Invoke-Test {
    param([string]$Name, [scriptblock]$Body)
    $script:CurrentSkipReason = $null
    try {
        & $Body
        if ($script:CurrentSkipReason) {
            $script:Skipped++
            Write-Host "SKIP $Name - $script:CurrentSkipReason"
        }
        else {
            $script:Passed++
            Write-Host "PASS $Name"
        }
    }
    catch {
        $script:Failed++
        Write-Host "FAIL $Name"
        Write-Host $_.Exception.ToString()
    }
}

function ConvertFrom-CodePoints {
    param([int[]]$CodePoints)
    return -join @($CodePoints | ForEach-Object { [char]$_ })
}

function Invoke-HelperProcess {
    param([string]$ScriptArguments)

    $powerShellPath = Join-Path $PSHOME 'powershell.exe'
    $startInfo = New-Object System.Diagnostics.ProcessStartInfo
    $startInfo.FileName = $powerShellPath
    $startInfo.Arguments = '-NoLogo -NoProfile -NonInteractive -STA -ExecutionPolicy Bypass -File "' + $helperPath + '" ' + $ScriptArguments
    $startInfo.UseShellExecute = $false
    $startInfo.CreateNoWindow = $true
    $startInfo.RedirectStandardOutput = $true
    $startInfo.RedirectStandardError = $true
    $startInfo.StandardOutputEncoding = New-Object System.Text.UTF8Encoding $false
    $startInfo.StandardErrorEncoding = New-Object System.Text.UTF8Encoding $false

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $startInfo
    try {
        [void]$process.Start()
        $stdoutTask = $process.StandardOutput.ReadToEndAsync()
        $stderrTask = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit(30000)) {
            $process.Kill()
            $process.WaitForExit()
            throw 'The helper process did not exit within 30 seconds.'
        }
        return New-Object PSObject -Property @{
            ExitCode = $process.ExitCode
            Stdout = $stdoutTask.Result
            Stderr = $stderrTask.Result
        }
    }
    finally {
        $process.Dispose()
    }
}

if (-not (Test-Path -LiteralPath $helperPath -PathType Leaf)) {
    [Console]::Error.WriteLine("Helper not found: $helperPath")
    exit 1
}

$tokens = $null
$parseErrors = $null
$helperAst = [System.Management.Automation.Language.Parser]::ParseFile(
    $helperPath,
    [ref]$tokens,
    [ref]$parseErrors
)
$functionAsts = @($helperAst.FindAll({
    param($node)
    $node -is [System.Management.Automation.Language.FunctionDefinitionAst]
}, $true))
$requiredFunctions = @(
    'Wait-WinRtOperation',
    'New-CompatibleBitmap',
    'Resize-Bitmap',
    'New-OcrEngine',
    'Normalize-OcrLine',
    'Invoke-Ocr'
)

Invoke-Test 'helper parses as Windows PowerShell source' {
    Assert-Equal $parseErrors.Count 0 'The helper has parser errors.'
    $nonAsciiBytes = @([System.IO.File]::ReadAllBytes($helperPath) | Where-Object { $_ -gt 127 })
    Assert-Equal $nonAsciiBytes.Count 0 'The BOM-less helper must remain ASCII-safe for Windows PowerShell 5.1.'
}

Invoke-Test 'required helper functions are defined exactly once' {
    foreach ($name in $requiredFunctions) {
        $matches = @($functionAsts | Where-Object { $_.Name -eq $name })
        Assert-Equal $matches.Count 1 "Unexpected definition count for $name."
    }
}

foreach ($name in $requiredFunctions) {
    $definition = @($functionAsts | Where-Object { $_.Name -eq $name })
    if ($definition.Count -eq 1) {
        . ([scriptblock]::Create($definition[0].Extent.Text))
    }
}

Invoke-Test 'CJK normalization removes only intra-script ASCII spaces' {
    $han = ConvertFrom-CodePoints @(0x4E2D, 0x6587)
    $spacedHan = ([string]$han[0]) + ' ' + ([string]$han[1])
    Assert-Equal (Normalize-OcrLine $spacedHan 'zh-Hans') $han 'Simplified Chinese spaces were not normalized.'
    Assert-Equal (Normalize-OcrLine $spacedHan 'yue-Hant') $han 'Cantonese spaces were not normalized.'

    $japanese = ConvertFrom-CodePoints @(0x65E5, 0x672C, 0x8A9E, 0x30C6, 0x30B9, 0x30C8)
    $spacedJapanese = (($japanese.ToCharArray() | ForEach-Object { [string]$_ }) -join ' ')
    Assert-Equal (Normalize-OcrLine $spacedJapanese 'ja-JP') $japanese 'Japanese spaces were not normalized.'
    Assert-Equal (Normalize-OcrLine $spacedJapanese 'JA-jp') $japanese 'Language tags should be matched case-insensitively.'
}

Invoke-Test 'CJK normalization preserves meaningful boundaries' {
    $han = ConvertFrom-CodePoints @(0x4E2D, 0x6587)
    $spacedHan = ([string]$han[0]) + ' ' + ([string]$han[1])
    Assert-Equal (Normalize-OcrLine $spacedHan 'en-US') $spacedHan 'Non-CJK language spacing changed.'

    $mixed = ([string]$han[0]) + ' A ' + ([string]$han[1])
    Assert-Equal (Normalize-OcrLine $mixed 'zh-Hans') $mixed 'Latin/CJK boundaries changed.'

    $hangul = ConvertFrom-CodePoints @(0xAC00, 0xB098)
    $spacedHangul = ([string]$hangul[0]) + ' ' + ([string]$hangul[1])
    Assert-Equal (Normalize-OcrLine $spacedHangul 'zh-Hans') $spacedHangul 'Hangul spacing changed.'

    $fullwidth = ConvertFrom-CodePoints @(0xFF11, 0xFF12)
    $spacedFullwidth = ([string]$fullwidth[0]) + ' ' + ([string]$fullwidth[1])
    Assert-Equal (Normalize-OcrLine $spacedFullwidth 'zh-Hans') $spacedFullwidth 'Fullwidth spacing changed.'

    $tabbed = ([string]$han[0]) + "`t" + ([string]$han[1])
    Assert-Equal (Normalize-OcrLine $tabbed 'zh-Hans') $tabbed 'Tab boundaries changed.'
    $nonBreaking = ([string]$han[0]) + ([char]0x00A0) + ([string]$han[1])
    Assert-Equal (Normalize-OcrLine $nonBreaking 'zh-Hans') $nonBreaking 'Non-breaking spaces changed.'
}

Invoke-Test 'bitmap resize clamps zero-sized requests' {
    Add-Type -AssemblyName System.Drawing
    $source = New-Object System.Drawing.Bitmap (20, 10)
    $resized = $null
    try {
        $resized = Resize-Bitmap $source 0 0
        Assert-Equal $resized.Width 1 'Resize width was not clamped.'
        Assert-Equal $resized.Height 1 'Resize height was not clamped.'
    }
    finally {
        if ($resized) { $resized.Dispose() }
        $source.Dispose()
    }
}

Invoke-Test 'language inventory uses one strict JSON protocol message' {
    $result = Invoke-HelperProcess '-ListLanguages'
    Assert-Equal $result.ExitCode 0 'Language inventory failed.'
    Assert-True ([string]::IsNullOrWhiteSpace($result.Stderr)) 'Language inventory wrote diagnostics to stderr.'
    $raw = $result.Stdout.Trim()
    Assert-True ($raw.StartsWith('{') -and $raw.EndsWith('}')) 'Language inventory was not one JSON object.'
    $payload = $raw | ConvertFrom-Json
    Assert-Equal $payload.status 'languages' 'Language inventory returned the wrong status.'
    Assert-True ($payload.PSObject.Properties.Name -contains 'languages') 'Language inventory omitted its languages array.'
    foreach ($language in @($payload.languages)) {
        Assert-True ($language.tag -match '^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8}){0,3}$') 'Language inventory returned an invalid tag.'
        Assert-True (-not [string]::IsNullOrWhiteSpace($language.displayName)) 'Language inventory returned an empty display name.'
    }
}

Invoke-Test 'invalid language arguments are rejected before helper execution' {
    $result = Invoke-HelperProcess '-ListLanguages -Language "ja-JP;Write-Output bad"'
    Assert-True ($result.ExitCode -ne 0) 'An invalid language argument was accepted.'
    Assert-True ([string]::IsNullOrWhiteSpace($result.Stdout)) 'An invalid argument produced a protocol payload.'
}

$script:WinRtReady = $false
Invoke-Test 'Windows Runtime OCR types initialize' {
    Add-Type -AssemblyName System.Drawing
    Add-Type -AssemblyName System.Runtime.WindowsRuntime
    $null = [Windows.Media.Ocr.OcrEngine,Windows.Foundation,ContentType=WindowsRuntime]
    $null = [Windows.Globalization.Language,Windows.Foundation,ContentType=WindowsRuntime]
    $null = [Windows.Graphics.Imaging.BitmapDecoder,Windows.Foundation,ContentType=WindowsRuntime]
    $script:AsTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
        $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and
        $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
    })[0]
    Assert-True ($null -ne $script:AsTaskGeneric) 'The WinRT AsTask adapter was not found.'
    $script:MaxClipboardFileBytes = 128MB
    $script:MaxSourceDimension = 32768
    $script:MaxSourcePixels = 100000000L
    $script:WinRtReady = $true
}

Invoke-Test 'explicit OCR engines keep the selected installed language' {
    if (-not $script:WinRtReady) { Skip-CurrentTest 'Windows Runtime initialization failed in the preceding test.'; return }
    $available = @([Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages)
    if ($available.Count -eq 0) {
        if ($RequireOcr) { throw 'No Windows OCR language packs are installed.' }
        Skip-CurrentTest 'No Windows OCR language packs are installed.'
        return
    }
    foreach ($language in $available) {
        $engine = New-OcrEngine $language.LanguageTag
        Assert-True ($null -ne $engine) "Could not create the installed $($language.LanguageTag) engine."
        Assert-True ($engine.RecognizerLanguage.LanguageTag -ieq $language.LanguageTag) "The $($language.LanguageTag) engine resolved to another language."
    }
}

Invoke-Test 'a missing regional pack does not resolve to an installed sibling' {
    if (-not $script:WinRtReady) { Skip-CurrentTest 'Windows Runtime initialization failed in the preceding test.'; return }
    $availableTags = @([Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages | ForEach-Object { $_.LanguageTag })
    $families = @(
        @{ Pattern = '^en-'; Candidates = @('en-US', 'en-GB', 'en-AU') },
        @{ Pattern = '^fr-'; Candidates = @('fr-FR', 'fr-CA', 'fr-BE') },
        @{ Pattern = '^es-'; Candidates = @('es-ES', 'es-MX', 'es-AR') },
        @{ Pattern = '^pt-'; Candidates = @('pt-BR', 'pt-PT') }
    )
    $missingTag = $null
    foreach ($family in $families) {
        if (@($availableTags | Where-Object { $_ -match $family.Pattern }).Count -eq 0) { continue }
        foreach ($candidate in $family.Candidates) {
            if ($availableTags -notcontains $candidate) { $missingTag = $candidate; break }
        }
        if ($missingTag) { break }
    }
    if (-not $missingTag) {
        Skip-CurrentTest 'No installed language has a suitable missing regional sibling.'
        return
    }
    Assert-True ($null -eq (New-OcrEngine $missingTag)) "The missing $missingTag pack resolved to a related installed pack."
}

Invoke-Test 'WinRT recognizes known text from an in-memory bitmap' {
    if (-not $script:WinRtReady) { Skip-CurrentTest 'Windows Runtime initialization failed in the preceding test.'; return }
    $latinLanguage = @([Windows.Media.Ocr.OcrEngine]::AvailableRecognizerLanguages | Where-Object {
        $_.Script -eq 'Latn'
    } | Select-Object -First 1)
    if ($latinLanguage.Count -eq 0) {
        if ($RequireOcr) { throw 'A Latin-script Windows OCR language pack is required for the known-text test.' }
        Skip-CurrentTest 'No Latin-script Windows OCR language pack is installed.'
        return
    }

    $bitmap = New-Object System.Drawing.Bitmap (1200, 240, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $graphics = $null
    $font = $null
    $brush = $null
    try {
        $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
        $graphics.Clear([System.Drawing.Color]::White)
        $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
        $font = New-Object System.Drawing.Font ('Segoe UI', 72, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
        $brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::Black)
        $graphics.DrawString('SCREENOCR TEST', $font, $brush, 30, 55)
        $graphics.Flush()

        $text = Invoke-Ocr $bitmap $latinLanguage[0].LanguageTag $false
        $canonical = [regex]::Replace($text, '[^A-Za-z]', '').ToUpperInvariant()
        Assert-Equal $canonical 'SCREENOCRTEST' 'WinRT did not recognize the rendered fixture.'
    }
    finally {
        if ($brush) { $brush.Dispose() }
        if ($font) { $font.Dispose() }
        if ($graphics) { $graphics.Dispose() }
        $bitmap.Dispose()
    }
}

Write-Host "RESULT pass=$script:Passed fail=$script:Failed skip=$script:Skipped"
if ($script:Failed -gt 0) { exit 1 }
exit 0
