#requires -Version 5.1
<#
    Synthesises text with the built-in Windows voices and, at the same time, records
    where every spoken word starts in the audio. The word map is what lets the reader
    overlay highlight the exact word being spoken.
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$TextFile,
    [Parameter(Mandatory = $true)][string]$WavFile,
    [Parameter(Mandatory = $true)][string]$MapFile,
    [string]$Voice = '',
    [int]$Rate = 0
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech

$text = [System.IO.File]::ReadAllText($TextFile, [System.Text.UTF8Encoding]::new($false))
if ([string]::IsNullOrWhiteSpace($text)) { throw 'Nothing to speak.' }

$map = New-Object System.Collections.Generic.List[object]
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer

# A direct delegate fires on the synthesis thread. Register-ObjectEvent would only
# drain its queue when the pipeline goes idle, which never happens during Speak().
$synth.add_SpeakProgress({
        param($sender, $e)
        $map.Add([pscustomobject]@{
                ms  = [int]$e.AudioPosition.TotalMilliseconds
                pos = [int]$e.CharacterPosition
                len = [int]$e.CharacterCount
            })
    })

if ($Voice) {
    try { $synth.SelectVoice($Voice) } catch { Write-Warning "Voice '$Voice' not available, using the default." }
}
$synth.Rate = [Math]::Max(-10, [Math]::Min(10, $Rate))

try {
    $synth.SetOutputToWaveFile($WavFile)
    $synth.Speak($text)
}
finally {
    $synth.SetOutputToDefaultAudioDevice()
    $synth.Dispose()
}

# Hand-built JSON: ConvertTo-Json collapses a one-item list into an object.
$parts = foreach ($w in $map) { '{"ms":' + $w.ms + ',"pos":' + $w.pos + ',"len":' + $w.len + '}' }
$json = '[' + ($parts -join ',') + ']'
[System.IO.File]::WriteAllText($MapFile, $json, [System.Text.UTF8Encoding]::new($false))
