#requires -Version 5.1
<#
    The reader: a single detached WPF process that owns the audio and the overlay.

    It stays alive between Raycast commands so that changing the speed swaps the audio
    without the window blinking. Everything it needs arrives through four files in the
    state directory:

        job.json      what to play and where every word sits in the audio
        control.json  pause / resume / stop
        status.json   written back every heartbeat so the commands know where we are
        request.json  written by THIS process when the panel needs new audio

    The panel is the only speed control there is. Clicking a chip, or clicking a word
    that lies before the current audio, needs a fresh synthesis, and this process has
    no engine of its own -- so it writes request.json and the background worker answers.
    Clicking a word the current audio already covers never leaves this process: it is a
    seek inside the wav, which costs nothing and lands in the same frame.

    Run it with -STA. Keep this file ASCII: Windows PowerShell 5.1 reads a BOM-less
    script as ANSI, which would mangle any accented literal.
#>
[CmdletBinding()]
param([Parameter(Mandatory = $true)][string]$StateDir)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase, System.Xaml

Add-Type -Namespace AzureTtsPlus -Name NativeWindow -MemberDefinition @'
[DllImport("user32.dll", SetLastError = true)]
public static extern int GetWindowLong(IntPtr hWnd, int nIndex);
[DllImport("user32.dll", SetLastError = true)]
public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);
[DllImport("user32.dll")]
public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
[DllImport("kernel32.dll")]
public static extern IntPtr GetConsoleWindow();
'@

# We are launched through `cmd /c start`, which is the only shape that gives this
# process a console of its own -- without one, PowerShell refuses to start; sharing
# the caller's, it dies the moment Raycast's command process exits. The console has
# to exist, but nobody should ever see it.
$console = [AzureTtsPlus.NativeWindow]::GetConsoleWindow()
if ($console -ne [IntPtr]::Zero) { [void][AzureTtsPlus.NativeWindow]::ShowWindow($console, 0) }

$script:JobFile = Join-Path $StateDir 'job.json'
$script:ControlFile = Join-Path $StateDir 'control.json'
$script:StatusFile = Join-Path $StateDir 'status.json'
$script:RequestFile = Join-Path $StateDir 'request.json'
$script:WorkerFile = Join-Path $StateDir 'worker.json'
$script:ActiveFlag = Join-Path $StateDir 'active.flag'
$script:LogFile = Join-Path $StateDir 'reader.log'

$script:Utf8 = New-Object System.Text.UTF8Encoding($false)
# Every number that leaves this process as JSON or as screen text goes through this.
# Under pt-BR, "1.5".ToString() is "1,5" -- which is invalid JSON and reads as a typo.
$script:Invariant = [Globalization.CultureInfo]::InvariantCulture

function Write-Log([string]$message) {
    try {
        $line = '{0:yyyy-MM-dd HH:mm:ss.fff}  {1}{2}' -f (Get-Date), $message, [Environment]::NewLine
        [System.IO.File]::AppendAllText($script:LogFile, $line, $script:Utf8)
    }
    catch { }
}

# One reader at a time: two copies would fight over the audio device. The check lives
# after Write-Log on purpose - a silent exit here once cost an afternoon of debugging.
$script:MutexCreated = $false
$script:Mutex = New-Object System.Threading.Mutex($true, 'Local\azure-tts-plus-reader', [ref]$script:MutexCreated)
if (-not $script:MutexCreated) {
    Write-Log "another reader already holds the lock; exiting (pid $PID)"
    return
}

function Read-JsonFile([string]$path) {
    for ($attempt = 0; $attempt -lt 3; $attempt++) {
        try {
            $raw = [System.IO.File]::ReadAllText($path, $script:Utf8)
            if ($raw) { return $raw | ConvertFrom-Json }
            return $null
        }
        catch { Start-Sleep -Milliseconds 20 }
    }
    return $null
}

function Write-StatusFile {
    $payload = '{{"pid":{0},"state":"{1}","jobId":"{2}","posMs":{3},"wordIndex":{4},"charPos":{5},"ts":{6}}}' -f `
        $PID, $script:State, $script:JobId, [int]$script:PosMs, $script:WordIndex, $script:CharPos,
    [long][Math]::Floor((Get-Date).ToUniversalTime().Subtract([datetime]'1970-01-01').TotalMilliseconds)
    $tmp = $script:StatusFile + '.tmp'
    try {
        [System.IO.File]::WriteAllText($tmp, $payload, $script:Utf8)
        [System.IO.File]::Copy($tmp, $script:StatusFile, $true)
        [System.IO.File]::Delete($tmp)
    }
    catch {
        if (-not $script:StatusWriteWarned) {
            $script:StatusWriteWarned = $true
            Write-Log "status write failed: $($_.Exception.Message)"
        }
    }
}

# ---------------------------------------------------------------- window

$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        WindowStyle="None" AllowsTransparency="True" Background="Transparent"
        Topmost="True" ShowInTaskbar="False" ShowActivated="False" ResizeMode="NoResize"
        SizeToContent="Height" Width="820" Opacity="0" WindowStartupLocation="Manual">
  <Border x:Name="Shell" CornerRadius="18" Background="#F50A0A0E" BorderBrush="#1AFFFFFF" BorderThickness="1" Padding="0">
    <Border.Effect>
      <DropShadowEffect BlurRadius="42" ShadowDepth="10" Direction="270" Opacity="0.55" Color="#000000"/>
    </Border.Effect>
    <StackPanel>
      <Grid Margin="30,22,30,14">
        <TextBlock x:Name="Meta" HorizontalAlignment="Left" Foreground="#6E6E7B" FontFamily="Segoe UI"
                   FontSize="10.5" FontWeight="SemiBold" Text=""/>
        <TextBlock x:Name="Stage" HorizontalAlignment="Right" Foreground="#6E6E7B" FontFamily="Segoe UI"
                   FontSize="10.5" FontWeight="SemiBold" Text=""/>
      </Grid>
      <TextBlock x:Name="Body" Margin="30,0,30,22" TextWrapping="Wrap" Foreground="#9A9AA6"
                 FontFamily="Georgia" FontSize="22" LineHeight="36" TextAlignment="Left"/>
      <!-- Inset hairline: an edge-to-edge bar would square off the rounded corners. -->
      <Grid x:Name="Track" Height="2" Margin="30,0,30,18">
        <Border Background="#14FFFFFF" CornerRadius="1"/>
        <Border x:Name="Progress" Background="#3D6CF0" CornerRadius="1" HorizontalAlignment="Left" Width="0"/>
      </Grid>
      <Grid Margin="30,0,30,20">
        <StackPanel x:Name="Speeds" Orientation="Horizontal" HorizontalAlignment="Left" VerticalAlignment="Center"/>
        <StackPanel Orientation="Horizontal" HorizontalAlignment="Right" VerticalAlignment="Center">
          <TextBlock x:Name="Hint" Foreground="#494954" FontFamily="Segoe UI" FontSize="9.5"
                     VerticalAlignment="Center" Text="CLICK A WORD TO READ FROM IT"/>
          <TextBlock x:Name="Readout" Foreground="#D8D8E2" FontFamily="Segoe UI" FontSize="11.5"
                     FontWeight="SemiBold" Margin="16,0,0,0" VerticalAlignment="Center" Text="1.0x"/>
        </StackPanel>
      </Grid>
    </StackPanel>
  </Border>
</Window>
'@

$script:Window = [Windows.Markup.XamlReader]::Parse($xaml)
$script:Body = $script:Window.FindName('Body')
$script:Meta = $script:Window.FindName('Meta')
$script:Stage = $script:Window.FindName('Stage')
$script:Progress = $script:Window.FindName('Progress')
$script:Track = $script:Window.FindName('Track')
$script:Speeds = $script:Window.FindName('Speeds')
$script:Readout = $script:Window.FindName('Readout')

function New-Brush([string]$hex) {
    $brush = New-Object Windows.Media.SolidColorBrush ([Windows.Media.ColorConverter]::ConvertFromString($hex))
    $brush.Freeze()
    return $brush
}

$dimBrush = New-Brush '#55555F'       # already read
$aheadBrush = New-Brush '#A6A6B4'     # not read yet
$liveBrush = New-Brush '#FFFFFF'      # the word being spoken
$markBrush = New-Brush '#2F63E8'      # behind the word being spoken
$hoverTextBrush = New-Brush '#ECECF4' # the word under the cursor
$hoverBrush = New-Brush '#1FFFFFFF'   # behind the word under the cursor
$chipOffBrush = New-Brush '#7C7C8A'
$chipHoverBrush = New-Brush '#1AFFFFFF'
$chipRestBrush = New-Brush '#12FFFFFF'

$script:Window.Add_SourceInitialized({
        $handle = (New-Object Windows.Interop.WindowInteropHelper($script:Window)).Handle
        $exStyle = [AzureTtsPlus.NativeWindow]::GetWindowLong($handle, -20)
        # NOACTIVATE keeps the caret where the user left it; TOOLWINDOW keeps us out of Alt+Tab.
        # Neither stops the mouse: the panel still gets clicks, it just never steals focus.
        [void][AzureTtsPlus.NativeWindow]::SetWindowLong($handle, -20, $exStyle -bor 0x08000000 -bor 0x00000080)
    })

# Anywhere that is not the text and not a chip is a drag handle. Once the panel has been
# moved by hand it stops being repositioned - the user's placement outranks ours.
$script:Window.Add_MouseLeftButtonDown({
        $script:Pinned = $true
        try { $script:Window.DragMove() } catch { }
    })

# ---------------------------------------------------------------- state

$script:State = 'idle'
$script:JobId = ''
$script:Label = ''
$script:Text = ''
$script:WordMs = @()
$script:WordPos = @()
$script:WordLen = @()
$script:CharOffset = 0
$script:WordIndex = -1
$script:CharPos = 0
$script:PosMs = 0
$script:DurationMs = 0
$script:Overlay = $true
$script:Visible = $false
$script:WinStart = -1
$script:WinEnd = -1
$script:JobStamp = ''
$script:ControlSeq = -1
$script:IdleSince = [Environment]::TickCount
$script:LastStatusWrite = 0
$script:Rate = 1.0
$script:RateBeforeRequest = 1.0
$script:Centered = $false
$script:Pinned = $false
$script:HoverPos = -1
$script:HoverLen = 0
$script:HoverX = -1000.0
$script:HoverY = -1000.0
$script:HoverChip = $null
$script:PendingSince = 0
$script:RateChips = @()
$script:Player = New-Object Windows.Media.MediaPlayer
$script:Player.Volume = 1.0
$script:Ended = $false
$script:Player.Add_MediaEnded({ $script:Ended = $true })

# How much text the panel shows at once, recomputed per job by Set-Layout. A rolling
# window keeps the visual weight steady and avoids building thousands of Run objects.
$script:WindowBack = 240
$script:WindowAhead = 560

# A worker that is beating is allowed this long to answer: synthesising the tail of a
# long article is seconds of work, and cutting it short would resume the old speed just
# before the new audio landed. A worker that is NOT beating is not waited for at all.
$script:PendingTimeoutMs = 30000
$script:PendingGraceMs = 1500

function Format-Rate([double]$rate) {
    return $rate.ToString('0.0#', $script:Invariant)
}

# ---------------------------------------------------------------- layout

<#
    Short text gets the compact panel near the bottom of the screen, out of the way.
    A long text is the thing being read, so the panel grows and takes the middle: the
    passage on screen is the reason the click-to-rewind gesture is worth anything.
#>
function Set-Layout {
    $area = [Windows.SystemParameters]::WorkArea
    $long = $script:Text.Length -gt 700

    if ($long) { $width = [Math]::Min(1180.0, [Math]::Max(820.0, $area.Width * 0.66)) }
    else { $width = 820.0 }

    $script:Centered = $long
    $script:Window.Width = $width
    # Belt for a very short screen: never taller than the work area.
    $script:Window.MaxHeight = [Math]::Max(320.0, $area.Height - 40.0)

    # Georgia at 22px averages about 11px a character, and a line is 36px tall. Sizing
    # the rolling window from the panel instead of from a constant is what keeps the
    # height still while the reading moves - a growing panel would fight the placement.
    $charsPerLine = [Math]::Max(24, [int](($width - 60.0) / 11.0))
    if ($long) { $budget = $area.Height * 0.52 } else { $budget = 420.0 }
    $lines = [Math]::Max(3, [int]($budget / 36.0))
    $capacity = $charsPerLine * $lines
    $script:WindowBack = [int]($capacity * 0.32)
    $script:WindowAhead = $capacity - $script:WindowBack
}

function Set-WindowPlacement {
    if ($script:Pinned) { return }
    $area = [Windows.SystemParameters]::WorkArea
    $height = $script:Window.ActualHeight
    if ($height -le 0) { $height = 260.0 }
    $script:Window.Left = $area.Left + (($area.Width - $script:Window.Width) / 2)
    if ($script:Centered) {
        $script:Window.Top = $area.Top + [Math]::Max(0.0, ($area.Height - $height) / 2)
    }
    else {
        $script:Window.Top = $area.Top + $area.Height - $height - 96
    }
}

# The panel is SizeToContent=Height, so its height only settles after the text is laid
# out. Placing on every size change is what keeps a centred panel actually centred.
$script:Window.Add_SizeChanged({ if ($script:Visible) { Set-WindowPlacement } })

function Show-Overlay {
    if ($script:Visible) { return }
    $script:Visible = $true
    $script:Window.Show()
    Set-WindowPlacement
    $fade = New-Object Windows.Media.Animation.DoubleAnimation(0, 1, (New-Object Windows.Duration ([TimeSpan]::FromMilliseconds(180))))
    $script:Window.BeginAnimation([Windows.Window]::OpacityProperty, $fade)
}

function Hide-Overlay {
    if (-not $script:Visible) { return }
    $script:Visible = $false
    $script:Window.BeginAnimation([Windows.Window]::OpacityProperty, $null)
    $script:Window.Opacity = 0
    $script:Window.Hide()
}

# ---------------------------------------------------------------- passage

function Get-SnappedStart([int]$target) {
    if ($target -le 0) { return 0 }
    $probe = $script:Text.LastIndexOf(' ', [Math]::Min($target, $script:Text.Length - 1))
    if ($probe -lt 0) { return 0 }
    return $probe + 1
}

function Get-SnappedEnd([int]$target) {
    if ($target -ge $script:Text.Length) { return $script:Text.Length }
    $probe = $script:Text.IndexOf(' ', $target)
    if ($probe -lt 0) { return $script:Text.Length }
    return $probe
}

function Set-Passage([int]$pos, [int]$len) {
    $script:WinStart = Get-SnappedStart ($pos - $script:WindowBack)
    $script:WinEnd = Get-SnappedEnd ($pos + $len + $script:WindowAhead)
}

function Get-PlainBrush([int]$segmentEnd, [int]$livePos) {
    if ($livePos -ge 0 -and $segmentEnd -le $livePos) { return $dimBrush }
    return $aheadBrush
}

function Add-Segment([int]$start, [int]$end, $foreground, $background) {
    if ($end -le $start) { return }
    $run = New-Object Windows.Documents.Run($script:Text.Substring($start, $end - $start))
    $run.Foreground = $foreground
    if ($null -ne $background) { $run.Background = $background }
    $script:Body.Inlines.Add($run)
}

<#
    Draws the visible passage with at most two marks on it: the word being spoken and
    the word under the cursor. Everything before the spoken word is dim, everything
    after is not-yet-read - so the marks are laid down in reading order and the plain
    stretches between them take their colour from where they sit relative to the voice.
#>
function Render-Passage {
    if ($script:WinStart -lt 0) { return }

    $livePos = -1
    $liveEnd = -1
    if ($script:WordIndex -ge 0 -and $script:WordIndex -lt $script:WordPos.Count) {
        $livePos = [int]$script:WordPos[$script:WordIndex]
        $liveEnd = $livePos + [int]$script:WordLen[$script:WordIndex]
    }

    $marks = @()
    if ($livePos -ge 0) { $marks += , @($livePos, $liveEnd, $true) }
    if ($script:HoverPos -ge 0 -and $script:HoverPos -ne $livePos) {
        $marks += , @($script:HoverPos, ($script:HoverPos + $script:HoverLen), $false)
    }
    if ($marks.Count -eq 2 -and $marks[0][0] -gt $marks[1][0]) { $marks = @($marks[1], $marks[0]) }

    $script:Body.Inlines.Clear()
    $cursor = $script:WinStart
    foreach ($mark in $marks) {
        $start = [Math]::Max($cursor, [int]$mark[0])
        $end = [Math]::Min($script:WinEnd, [int]$mark[1])
        if ($end -le $cursor) { continue }
        Add-Segment $cursor $start (Get-PlainBrush $start $livePos) $null
        if ($mark[2]) { Add-Segment $start $end $liveBrush $markBrush }
        else { Add-Segment $start $end $hoverTextBrush $hoverBrush }
        $cursor = $end
    }
    Add-Segment $cursor $script:WinEnd (Get-PlainBrush $script:WinEnd $livePos) $null
}

function Update-Passage([int]$pos, [int]$len) {
    if ($script:WinStart -lt 0 -or $pos -lt $script:WinStart -or ($pos + $len) -gt $script:WinEnd) {
        Set-Passage $pos $len
    }
    Render-Passage
}

function Show-PlainPassage([int]$from) {
    Set-Passage $from 0
    Render-Passage
}

function Set-Meta([string]$label) {
    $script:Meta.Text = $label.ToUpper()
}

function Set-Stage([string]$text) {
    $script:PendingSince = 0
    $script:Stage.Text = $text
}

function Set-Pending([string]$text) {
    $script:Stage.Text = $text
    $script:PendingSince = [Environment]::TickCount
}

function Restore-Stage {
    if ($script:State -eq 'paused') { Set-Stage 'PAUSED' } else { Set-Stage 'READING' }
}

# ---------------------------------------------------------------- requests

<#
    The panel has no synthesiser. Anything that needs new audio -- a speed change, or a
    click on a word that sits before the audio we hold -- is handed to the background
    worker through this file. Concatenation, never the -f operator: a literal brace in a
    format string is a silent way to write invalid JSON.
#>
function Send-Request([string]$payload) {
    $seq = 1
    $existing = Read-JsonFile $script:RequestFile
    if ($existing -and $null -ne $existing.seq) { $seq = [int]$existing.seq + 1 }
    $body = '{"seq":' + $seq + ',' + $payload + '}'
    $tmp = $script:RequestFile + '.reader.tmp'
    try {
        [System.IO.File]::WriteAllText($tmp, $body, $script:Utf8)
        [System.IO.File]::Copy($tmp, $script:RequestFile, $true)
        [System.IO.File]::Delete($tmp)
    }
    catch { Write-Log "request write failed: $($_.Exception.Message)" }
}

# Silence now, not in 600ms. The worker pauses us too, but its message has to travel
# through a file; muting here means the old speed never overlaps the answer.
function Suspend-ForRequest {
    if ($script:State -eq 'playing') {
        try { $script:Player.Pause() } catch { }
        $script:State = 'paused'
    }
}

function Set-Rate([double]$rate) {
    $rate = [Math]::Round([Math]::Min(2.5, [Math]::Max(0.5, $rate)), 1)
    if ([Math]::Abs($rate - $script:Rate) -lt 0.001) { return }
    # The chip lights up before the audio arrives, so the click feels answered. If the
    # answer never comes, this is what the panel goes back to saying.
    $script:RateBeforeRequest = $script:Rate
    $script:Rate = $rate
    Update-RateChips
    Suspend-ForRequest
    Set-Pending 'CHANGING SPEED'
    Send-Request ('"kind":"rate","rate":' + (Format-Rate $rate))
    Write-Log "panel asked for $($rate)x"
}

# ---------------------------------------------------------------- speed chips

function Update-RateChips {
    $onLadder = $false
    foreach ($chip in $script:RateChips) {
        $selected = $chip.Kind -eq 'preset' -and [Math]::Abs($chip.Rate - $script:Rate) -lt 0.001
        if ($selected) {
            $onLadder = $true
            $chip.Border.Background = $markBrush
            $chip.Text.Foreground = $liveBrush
        }
        elseif ([object]::ReferenceEquals($chip.Border, $script:HoverChip)) {
            $chip.Border.Background = $chipHoverBrush
            $chip.Text.Foreground = $aheadBrush
        }
        else {
            $chip.Border.Background = $chip.Resting
            $chip.Text.Foreground = $chipOffBrush
        }
    }
    # The readout only earns its place when - and + have taken the speed off the ladder.
    # Printing 1.0x beside a chip that already says 1.0x is noise.
    $script:Readout.Text = (Format-Rate $script:Rate) + 'x'
    if ($onLadder) { $script:Readout.Visibility = 'Collapsed' }
    else { $script:Readout.Visibility = 'Visible' }
}

function New-Chip([string]$caption, [string]$kind, [double]$rate, [scriptblock]$onClick) {
    $nudge = $kind -eq 'nudge'

    $text = New-Object Windows.Controls.TextBlock
    $text.Text = $caption
    $text.FontFamily = New-Object Windows.Media.FontFamily('Segoe UI')
    $text.FontSize = 11
    $text.FontWeight = [Windows.FontWeights]::SemiBold
    $text.Foreground = $chipOffBrush
    $text.TextAlignment = 'Center'

    $border = New-Object Windows.Controls.Border
    $border.Child = $text
    $border.CornerRadius = New-Object Windows.CornerRadius(9)
    $border.Padding = New-Object Windows.Thickness(9, 4, 9, 5)
    $border.Cursor = [Windows.Input.Cursors]::Hand
    if ($nudge) {
        # A bare "-" reads as a stray character. The presets are text until chosen, so
        # the two nudges carry a resting fill instead: it is what makes them buttons.
        $border.MinWidth = 30
        $border.Margin = New-Object Windows.Thickness(0, 0, 10, 0)
        $chipResting = $chipRestBrush
    }
    else {
        $border.Margin = New-Object Windows.Thickness(0, 0, 5, 0)
        # Transparent, not $null: a Border with no brush is invisible to the mouse.
        $chipResting = [Windows.Media.Brushes]::Transparent
    }
    $border.Background = $chipResting
    $border.Add_MouseLeftButtonDown($onClick)
    $border.Add_MouseEnter({ param($sender, $e) $script:HoverChip = $sender; Update-RateChips })
    $border.Add_MouseLeave({ param($sender, $e) if ([object]::ReferenceEquals($script:HoverChip, $sender)) { $script:HoverChip = $null; Update-RateChips } })

    $chip = [PSCustomObject]@{ Kind = $kind; Rate = $rate; Border = $border; Text = $text; Resting = $chipResting }
    $script:RateChips += $chip
    [void]$script:Speeds.Children.Add($border)
    return $chip
}

# The ladder lives on the same 0.1 grid as the rest of the extension -- 1.25x would be
# rounded to 1.3x on the way through, so the chip would light up a speed nobody picked.
# The rate travels on the Border's Tag, never captured in the handler: a scriptblock
# built in a loop reads the loop variable at click time, which by then is the last one.
[void](New-Chip '-' 'nudge' 0 { param($sender, $e) $e.Handled = $true; Set-Rate ($script:Rate - 0.1) })
foreach ($preset in @(0.8, 1.0, 1.2, 1.5, 1.8, 2.0, 2.5)) {
    $chip = New-Chip ((Format-Rate $preset) + 'x') 'preset' $preset {
        param($sender, $e) $e.Handled = $true; Set-Rate ([double]$sender.Tag)
    }
    $chip.Border.Tag = $preset
}
[void](New-Chip '+' 'nudge' 0 { param($sender, $e) $e.Handled = $true; Set-Rate ($script:Rate + 0.1) })
Update-RateChips

# ---------------------------------------------------------------- click to rewind

<#
    Where in the original text a point on the panel lands.

    A TextPointer counts symbols, not characters -- every Run boundary is one symbol -
    so walking run by run and only measuring inside the run that contains the target is
    the one arithmetic that stays correct however many marks Render-Passage laid down.
#>
function Get-BodyOffset([Windows.Point]$point) {
    if ($script:WinStart -lt 0) { return -1 }
    $target = $script:Body.GetPositionFromPoint($point, $true)
    if ($null -eq $target) { return -1 }

    $forward = [Windows.Documents.LogicalDirection]::Forward
    $offset = 0
    $nav = $script:Body.ContentStart
    while ($null -ne $nav -and $nav.CompareTo($target) -lt 0) {
        if ($nav.GetPointerContext($forward) -eq [Windows.Documents.TextPointerContext]::Text) {
            $run = $nav.GetTextInRun($forward)
            if ($run.Length -gt 0) {
                $next = $nav.GetPositionAtOffset($run.Length, $forward)
                if ($null -ne $next -and $next.CompareTo($target) -le 0) {
                    $offset += $run.Length
                    $nav = $next
                    continue
                }
                $offset += $nav.GetOffsetToPosition($target)
                break
            }
        }
        $nav = $nav.GetNextContextPosition($forward)
    }
    return $script:WinStart + $offset
}

function Get-WordStart([int]$pos) {
    if ($script:Text.Length -eq 0) { return 0 }
    if ($pos -lt 0) { $pos = 0 }
    if ($pos -ge $script:Text.Length) { $pos = $script:Text.Length - 1 }
    # Landing between words means the user aimed at the next one.
    while ($pos -lt $script:Text.Length -and [char]::IsWhiteSpace($script:Text[$pos])) { $pos++ }
    if ($pos -ge $script:Text.Length) { $pos = $script:Text.Length - 1 }
    while ($pos -gt 0 -and -not [char]::IsWhiteSpace($script:Text[$pos - 1])) { $pos-- }
    return $pos
}

function Get-WordLength([int]$start) {
    $end = $start
    while ($end -lt $script:Text.Length -and -not [char]::IsWhiteSpace($script:Text[$end])) { $end++ }
    return [Math]::Max(1, $end - $start)
}

# Last word that starts at or before $charPos, or -1 when the click is behind the audio
# this job holds. `pos` grows with `ms`, so a binary search is safe and instant.
function Find-WordIndex([int]$charPos) {
    $count = $script:WordPos.Count
    if ($count -eq 0) { return -1 }
    if ($charPos -lt [int]$script:WordPos[0]) { return -1 }
    $low = 0
    $high = $count - 1
    while ($low -lt $high) {
        $mid = [int](($low + $high + 1) / 2)
        if ([int]$script:WordPos[$mid] -le $charPos) { $low = $mid } else { $high = $mid - 1 }
    }
    return $low
}

function Seek-ToWord([int]$index) {
    $ms = [int]$script:WordMs[$index]
    try { $script:Player.Position = [TimeSpan]::FromMilliseconds($ms) }
    catch {
        Write-Log "seek to ${ms}ms failed: $($_.Exception.Message)"
        return
    }
    $script:PosMs = $ms
    $script:Ended = $false
    $script:WordIndex = $index
    $script:CharPos = [int]$script:WordPos[$index]
    if ($script:State -ne 'playing') {
        try { $script:Player.Play() } catch { }
        $script:State = 'playing'
    }
    Set-Stage 'READING'
    Update-Passage $script:CharPos ([int]$script:WordLen[$index])
    Write-Log "rewound to word $index (char $($script:CharPos), ${ms}ms)"
}

function Invoke-SeekToPoint([Windows.Point]$point) {
    if ($script:State -eq 'idle') { return }
    $offset = Get-BodyOffset $point
    if ($offset -lt 0) { return }
    $pos = Get-WordStart $offset
    $index = Find-WordIndex $pos
    if ($index -ge 0) {
        # The audio already covers this word: a seek inside the wav, no synthesis at all.
        Seek-ToWord $index
        return
    }
    # Behind the start of this audio. Only a new synthesis can read it.
    Suspend-ForRequest
    Set-Pending 'GOING BACK'
    Send-Request ('"kind":"seek","pos":' + $pos)
    Write-Log "panel asked to read again from char $pos"
}

function Clear-Hover {
    if ($script:HoverPos -lt 0) { return }
    $script:HoverPos = -1
    $script:HoverLen = 0
    Render-Passage
}

function Update-Hover([Windows.Point]$point) {
    if ($script:State -eq 'idle') { return }
    # Cheap gate first: the mouse reports far more often than a word is wide.
    if ([Math]::Abs($point.X - $script:HoverX) -lt 3 -and [Math]::Abs($point.Y - $script:HoverY) -lt 3) { return }
    $script:HoverX = $point.X
    $script:HoverY = $point.Y

    $offset = Get-BodyOffset $point
    if ($offset -lt 0) { Clear-Hover; return }
    $start = Get-WordStart $offset
    if ($start -eq $script:HoverPos) { return }
    $script:HoverPos = $start
    $script:HoverLen = Get-WordLength $start
    Render-Passage
}

$script:Body.Cursor = [Windows.Input.Cursors]::Hand
# Handled = true is what tells the window-level handler not to start a drag: inside the
# text the left button means "read from here", everywhere else it means "move me".
$script:Body.Add_MouseLeftButtonDown({ param($sender, $e) $e.Handled = $true; Invoke-SeekToPoint ($e.GetPosition($script:Body)) })
$script:Body.Add_MouseMove({ param($sender, $e) Update-Hover ($e.GetPosition($script:Body)) })
$script:Body.Add_MouseLeave({ param($sender, $e) Clear-Hover })

# ---------------------------------------------------------------- job

function Stop-Playback {
    try { $script:Player.Stop() } catch { }
    try { $script:Player.Close() } catch { }
    $script:State = 'idle'
    $script:JobId = ''
    $script:WordIndex = -1
    $script:PosMs = 0
    $script:HoverPos = -1
    $script:HoverLen = 0
    $script:PendingSince = 0
    $script:IdleSince = [Environment]::TickCount
    Hide-Overlay
    if (Test-Path $script:ActiveFlag) { Remove-Item $script:ActiveFlag -Force -ErrorAction SilentlyContinue }
}

function Load-Job {
    $job = Read-JsonFile $script:JobFile
    if (-not $job) { return }
    if ($job.id -eq $script:JobId) { return }
    if (-not (Test-Path $job.wav)) { Write-Log "job $($job.id): wav missing"; return }

    $fresh = -not $job.continuation
    $script:JobId = $job.id
    $script:Text = [string]$job.text
    $script:WordMs = @($job.ms)
    $script:WordPos = @($job.pos)
    $script:WordLen = @($job.len)
    $script:CharOffset = [int]$job.charOffset
    $script:Label = [string]$job.label
    $script:Overlay = [bool]$job.overlay
    $script:Rate = [double]$job.rate
    $script:WordIndex = -1
    $script:CharPos = $script:CharOffset
    $script:PosMs = 0
    $script:Ended = $false
    $script:HoverPos = -1
    $script:HoverLen = 0
    # A new reading gets our placement again; a continuation keeps wherever it was put.
    if ($fresh) { $script:Pinned = $false }

    try { $script:Player.Stop() } catch { }
    $script:Player.Open([Uri]$job.wav)
    $script:Player.Play()
    $script:State = 'playing'
    Set-Meta $script:Label
    Set-Stage 'READING'
    Update-RateChips
    Set-Layout
    Show-PlainPassage $script:CharOffset
    if ($script:Overlay) { Show-Overlay } else { Hide-Overlay }
    if ($script:Visible) { Set-WindowPlacement }
    New-Item -Path $script:ActiveFlag -ItemType File -Force | Out-Null
    Write-Log "job $($job.id) loaded, $($script:WordMs.Count) words, rate $($job.rate)"
}

function Invoke-Control {
    $control = Read-JsonFile $script:ControlFile
    if (-not $control) { return }
    if ([int]$control.seq -eq $script:ControlSeq) { return }
    $script:ControlSeq = [int]$control.seq
    switch ($control.cmd) {
        'stop' { Stop-Playback }
        'pause' {
            if ($script:State -eq 'playing') { $script:Player.Pause(); $script:State = 'paused'; Set-Stage 'PAUSED' }
        }
        'resume' {
            if ($script:State -eq 'paused') { $script:Player.Play(); $script:State = 'playing'; Set-Stage 'READING' }
        }
        'toggle-pause' {
            if ($script:State -eq 'playing') { $script:Player.Pause(); $script:State = 'paused'; Set-Stage 'PAUSED' }
            elseif ($script:State -eq 'paused') { $script:Player.Play(); $script:State = 'playing'; Set-Stage 'READING' }
        }
    }
}

function Update-Position {
    if ($script:State -eq 'idle') { return }
    if ($script:Ended) { Stop-Playback; return }
    if ($script:State -eq 'paused') { return }

    $script:PosMs = [int]$script:Player.Position.TotalMilliseconds
    if ($script:Player.NaturalDuration.HasTimeSpan) {
        $script:DurationMs = [int]$script:Player.NaturalDuration.TimeSpan.TotalMilliseconds
    }

    $count = $script:WordMs.Count
    if ($count -gt 0) {
        $index = $script:WordIndex
        while (($index + 1) -lt $count -and $script:WordMs[$index + 1] -le $script:PosMs) { $index++ }
        if ($index -ne $script:WordIndex -and $index -ge 0) {
            $script:WordIndex = $index
            $script:CharPos = $script:WordPos[$index]
            Update-Passage $script:WordPos[$index] $script:WordLen[$index]
        }
    }

    if ($script:DurationMs -gt 0) {
        $ratio = [Math]::Min(1.0, $script:PosMs / [double]$script:DurationMs)
        $script:Progress.Width = $script:Track.ActualWidth * $ratio
    }
}

# The worker publishes a heartbeat every second, and it keeps publishing while it
# synthesises. So "no answer yet" and "nobody is there" are two different questions, and
# only the second one is worth interrupting the reading for.
function Test-WorkerAlive {
    $beat = Read-JsonFile $script:WorkerFile
    if (-not $beat -or $null -eq $beat.ts) { return $false }
    $now = [long][Math]::Floor((Get-Date).ToUniversalTime().Subtract([datetime]'1970-01-01').TotalMilliseconds)
    return (($now - [long]$beat.ts) -le 4000)
}

# A request nobody answered. Say so on the panel and give the audio back, instead of
# leaving a silent window that says CHANGING SPEED forever.
function Test-PendingTimeout {
    if ($script:PendingSince -le 0) { return }
    $waited = [Environment]::TickCount - $script:PendingSince
    if ($waited -lt $script:PendingGraceMs) { return }
    $alive = Test-WorkerAlive
    if ($alive -and $waited -lt $script:PendingTimeoutMs) { return }
    if ($alive) { Write-Log "the worker did not answer in ${waited}ms" }
    else { Write-Log 'no worker heartbeat; giving the audio back at the old speed' }
    if ($script:State -eq 'paused') {
        try { $script:Player.Play() } catch { }
        $script:State = 'playing'
    }
    Set-Stage 'READING'
    $script:Rate = $script:RateBeforeRequest
    Update-RateChips
}

# ---------------------------------------------------------------- loop

$script:Timer = New-Object Windows.Threading.DispatcherTimer
$script:Timer.Interval = [TimeSpan]::FromMilliseconds(40)
$script:Timer.Add_Tick({
        try {
            if (Test-Path $script:JobFile) {
                $stamp = [string](Get-Item $script:JobFile).LastWriteTimeUtc.Ticks
                if ($stamp -ne $script:JobStamp) { $script:JobStamp = $stamp; Load-Job }
            }
            if (Test-Path $script:ControlFile) { Invoke-Control }
            Update-Position
            Test-PendingTimeout

            $now = [Environment]::TickCount
            if (($now - $script:LastStatusWrite) -ge 150) {
                $script:LastStatusWrite = $now
                Write-StatusFile
            }
            # Nothing to read for a while: give the memory back, the next command respawns us.
            if ($script:State -eq 'idle' -and ($now - $script:IdleSince) -gt 45000) {
                $script:Timer.Stop()
                $script:Window.Close()
            }
        }
        catch {
            Write-Log "tick failed: $($_.Exception.Message)"
        }
    })

# Adopt whatever control sequence is already on disk without acting on it. A fresh
# reader that replayed the previous session's "stop" would kill the reading it was
# just spawned to perform.
$existingControl = Read-JsonFile $script:ControlFile
if ($existingControl) { $script:ControlSeq = [int]$existingControl.seq }

# The very first heartbeat has to be on disk before the command that spawned us looks.
Write-StatusFile
$script:Timer.Start()

try {
    $app = New-Object Windows.Application
    $app.ShutdownMode = [Windows.ShutdownMode]::OnExplicitShutdown
    $script:Window.Add_Closed({ $app.Shutdown() })
    [void]$app.Run()
}
finally {
    if (Test-Path $script:ActiveFlag) { Remove-Item $script:ActiveFlag -Force -ErrorAction SilentlyContinue }
    $script:State = 'idle'
    Write-StatusFile
    try { $script:Mutex.ReleaseMutex() } catch { }
}
