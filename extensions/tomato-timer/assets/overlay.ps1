param(
  [Parameter(Mandatory = $true)][string]$Dir,
  [Parameter(Mandatory = $true)][string]$Id
)

# Tomato Timer floating countdown. Watches active.json in $Dir, shows the time
# left in a small always-on-top window, and notifies when the session ends.

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName PresentationFramework, PresentationCore, WindowsBase

$utf8 = New-Object System.Text.UTF8Encoding($false)
$inv = [Globalization.CultureInfo]::InvariantCulture
$statePath = Join-Path $Dir 'active.json'
$beatPath = Join-Path $Dir 'overlay.beat'
$posPath = Join-Path $Dir 'overlay-position.json'
$logPath = Join-Path $Dir 'overlay.log'

function Write-Log([string]$msg) {
  try { [IO.File]::AppendAllText($logPath, (Get-Date -Format o) + " [$Id] " + $msg + "`r`n", $utf8) } catch {}
}

function Get-NowMs { [DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds() }

function Read-State {
  if (-not (Test-Path -LiteralPath $statePath)) { return $null }
  try {
    $raw = [IO.File]::ReadAllText($statePath, $utf8).TrimStart([char]0xFEFF)
    if ([string]::IsNullOrWhiteSpace($raw)) { return 'busy' }
    $parsed = $raw | ConvertFrom-Json
    if ($null -eq $parsed) { return 'busy' }
    return $parsed
  } catch { return 'busy' }
}

function Save-State($s) {
  $tmp = "$statePath.overlay.tmp"
  [IO.File]::WriteAllText($tmp, ($s | ConvertTo-Json -Compress -Depth 4), $utf8)
  Move-Item -LiteralPath $tmp -Destination $statePath -Force
}

function Set-Prop($obj, [string]$name, $value) {
  $obj | Add-Member -NotePropertyName $name -NotePropertyValue $value -Force
}

# One floating timer at a time. A new session waits for the previous window,
# which closes itself within a second once it sees a different session id.
$mutex = New-Object System.Threading.Mutex($false, 'Local\TomatoTimerOverlay')
try { $owned = $mutex.WaitOne(5000) } catch [System.Threading.AbandonedMutexException] { $owned = $true }
if (-not $owned) { Write-Log 'another window is still open'; exit 0 }

[xml]$xaml = @'
<Window xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation"
        xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml"
        Title="Tomato Timer" WindowStyle="None" AllowsTransparency="True" Background="Transparent"
        Topmost="True" ShowInTaskbar="False" ShowActivated="False" ResizeMode="NoResize"
        SizeToContent="WidthAndHeight" UseLayoutRounding="True" Opacity="0">
  <Window.Resources>
    <Style x:Key="IconButton" TargetType="Button">
      <Setter Property="Width" Value="28"/>
      <Setter Property="Height" Value="28"/>
      <Setter Property="Margin" Value="2,0,0,0"/>
      <Setter Property="Foreground" Value="#D4D4D8"/>
      <Setter Property="FontFamily" Value="Segoe Fluent Icons, Segoe MDL2 Assets"/>
      <Setter Property="FontSize" Value="12"/>
      <Setter Property="Cursor" Value="Hand"/>
      <Setter Property="Template">
        <Setter.Value>
          <ControlTemplate TargetType="Button">
            <Border x:Name="Bg" CornerRadius="14" Background="#00FFFFFF">
              <ContentPresenter HorizontalAlignment="Center" VerticalAlignment="Center"/>
            </Border>
            <ControlTemplate.Triggers>
              <Trigger Property="IsMouseOver" Value="True">
                <Setter TargetName="Bg" Property="Background" Value="#26FFFFFF"/>
              </Trigger>
              <Trigger Property="IsPressed" Value="True">
                <Setter TargetName="Bg" Property="Background" Value="#40FFFFFF"/>
              </Trigger>
            </ControlTemplate.Triggers>
          </ControlTemplate>
        </Setter.Value>
      </Setter>
    </Style>
  </Window.Resources>
  <Border x:Name="Card" Margin="18" CornerRadius="24" Background="#F2161618" BorderBrush="#1FFFFFFF"
          BorderThickness="1" Padding="10,10,12,10" Cursor="SizeAll">
    <Border.Effect>
      <DropShadowEffect BlurRadius="22" ShadowDepth="3" Direction="270" Opacity="0.45" Color="#000000"/>
    </Border.Effect>
    <Grid>
      <Grid.ColumnDefinitions>
        <ColumnDefinition Width="Auto"/>
        <ColumnDefinition Width="Auto"/>
        <ColumnDefinition Width="Auto"/>
      </Grid.ColumnDefinitions>
      <Grid Width="44" Height="44" VerticalAlignment="Center">
        <Ellipse Stroke="#2E2E33" StrokeThickness="4" Margin="2"/>
        <Path x:Name="Arc" Stroke="#E5484D" StrokeThickness="4" StrokeStartLineCap="Round" StrokeEndLineCap="Round"/>
        <TextBlock x:Name="Glyph" FontFamily="Segoe Fluent Icons, Segoe MDL2 Assets" FontSize="13"
                   Foreground="#A1A1AA" HorizontalAlignment="Center" VerticalAlignment="Center"/>
      </Grid>
      <StackPanel Grid.Column="1" Margin="12,0,4,0" VerticalAlignment="Center" Width="112">
        <TextBlock x:Name="Time" Text="25:00" FontFamily="Segoe UI Variable Display, Segoe UI" FontWeight="SemiBold"
                   FontSize="26" Foreground="#FAFAFA" Typography.NumeralAlignment="Tabular" Margin="0,-3,0,-1"/>
        <TextBlock x:Name="Sub" Text="Focus" FontFamily="Segoe UI Variable Text, Segoe UI" FontSize="12"
                   Foreground="#A1A1AA" TextTrimming="CharacterEllipsis"/>
      </StackPanel>
      <StackPanel x:Name="Controls" Grid.Column="2" Orientation="Horizontal" VerticalAlignment="Center" Visibility="Collapsed" Margin="4,0,0,0">
        <Button x:Name="PauseBtn" Style="{StaticResource IconButton}" ToolTip="Pause" Content="&#xE769;"/>
        <Button x:Name="StopBtn" Style="{StaticResource IconButton}" ToolTip="Stop" Content="&#xE71A;"/>
        <Button x:Name="HideBtn" Style="{StaticResource IconButton}" ToolTip="Hide (the timer keeps running)" Content="&#xE921;"/>
      </StackPanel>
    </Grid>
  </Border>
</Window>
'@

$win = [Windows.Markup.XamlReader]::Load((New-Object System.Xml.XmlNodeReader $xaml))
$card = $win.FindName('Card')
$arc = $win.FindName('Arc')
$glyph = $win.FindName('Glyph')
$time = $win.FindName('Time')
$sub = $win.FindName('Sub')
$controls = $win.FindName('Controls')
$pauseBtn = $win.FindName('PauseBtn')
$stopBtn = $win.FindName('StopBtn')
$hideBtn = $win.FindName('HideBtn')

$accent = [Windows.Media.BrushConverter]::new().ConvertFromString('#E5484D')
$neutral = [Windows.Media.BrushConverter]::new().ConvertFromString('#D4D4D8')

$script:last = $null
$script:done = $false
$script:closeAt = 0
$script:misses = 0

function Set-Arc([double]$fraction) {
  $c = 22.0; $r = 20.0
  if ($fraction -ge 0.999) {
    $arc.Data = New-Object Windows.Media.EllipseGeometry((New-Object Windows.Point($c, $c)), $r, $r)
    return
  }
  if ($fraction -le 0.002) { $arc.Data = $null; return }
  $angle = 2 * [Math]::PI * $fraction
  $x = $c + $r * [Math]::Sin($angle)
  $y = $c - $r * [Math]::Cos($angle)
  $large = if ($fraction -gt 0.5) { 1 } else { 0 }
  $d = [string]::Format($inv, 'M {0},{1} A {2},{2} 0 {3} 1 {4},{5}', $c, ($c - $r), $r, $large, $x, $y)
  $arc.Data = [Windows.Media.Geometry]::Parse($d)
}

function Format-Clock([long]$ms) {
  $total = [Math]::Max(0, [Math]::Ceiling($ms / 1000.0))
  $m = [Math]::Floor($total / 60); $s = $total % 60
  return ('{0:00}:{1:00}' -f $m, $s)
}

function Show-Toast([string]$title, [string]$body) {
  try {
    [Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null
    [Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null
    $esc = { param($t) [Security.SecurityElement]::Escape($t) }
    $doc = New-Object Windows.Data.Xml.Dom.XmlDocument
    $doc.LoadXml("<toast><visual><binding template=`"ToastGeneric`"><text>$(& $esc $title)</text><text>$(& $esc $body)</text></binding></visual><audio silent=`"true`"/></toast>")
    $appId = '{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\WindowsPowerShell\v1.0\powershell.exe'
    [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($appId).Show([Windows.UI.Notifications.ToastNotification]::new($doc))
    Write-Log 'toast ok'
  } catch { Write-Log ('toast error ' + $_.Exception.Message) }
}

function Complete-Session($s) {
  $script:done = $true
  $showWindow = $s.overlay -ne $false
  # A hidden timer stays hidden; the process only lives long enough for the sound to play.
  $script:closeAt = (Get-NowMs) + $(if ($showWindow) { 12000 } else { 6000 })
  $isFocus = $s.kind -eq 'focus'
  $time.Text = 'Done'
  $sub.Text = if ($isFocus) { 'Time for a break' } else { 'Back to focus' }
  $glyph.Text = [string][char]0xE73E
  $glyph.Foreground = $accent
  $arc.Stroke = $accent
  Set-Arc 1
  $pauseBtn.Visibility = 'Collapsed'
  $stopBtn.Visibility = 'Collapsed'
  if ($showWindow) {
    $win.Visibility = 'Visible'
    $win.Opacity = 1
  }
  $title = if ($isFocus) { 'Focus session complete' } else { 'Break is over' }
  $body = if ($isFocus) { if ($s.label) { "$($s.label). Time for a break." } else { 'Time for a break.' } } else { 'Ready for the next focus session?' }
  Show-Toast $title $body
  if ($s.sound -ne $false) {
    try { (New-Object System.Media.SoundPlayer (Join-Path $env:SystemRoot 'Media\Alarm01.wav')).Play(); Write-Log 'sound ok' } catch { Write-Log 'sound error' }
  }
}

function Update-View {
  if ($script:done) {
    $next = Read-State
    $replaced = $next -isnot [string] -and $null -ne $next -and $next.id -ne $Id
    if ($replaced -or (Get-NowMs) -ge $script:closeAt) { $win.Close() }
    return
  }
  $s = Read-State
  if ($s -is [string]) { return }
  $now = Get-NowMs
  if ($null -eq $s -or $s.id -ne $Id -or $s.stoppedAt) {
    # Needs two reads in a row, so a file caught mid-replace never closes the window.
    $script:misses++
    if ($script:misses -lt 2 -and -not $s.stoppedAt) { return }
    # The view may have recorded the finished session before this tick saw it.
    if ($script:last -and -not $script:last.paused -and $script:last.endAt -le $now -and ($null -eq $s -or $s.id -ne $Id)) {
      Complete-Session $script:last
    } else {
      $win.Close()
    }
    return
  }
  $script:misses = 0
  $script:last = $s
  try { [IO.File]::WriteAllText($beatPath, "$Id|$PID|$now", $utf8) } catch {}

  $win.Visibility = if ($s.overlay -eq $false) { 'Hidden' } else { 'Visible' }
  $win.Opacity = 1
  $remaining = if ($s.paused) { [long]$s.remainingMs } else { [long]$s.endAt - $now }
  if (-not $s.paused -and $remaining -le 0) { Complete-Session $s; return }

  $isFocus = $s.kind -eq 'focus'
  $arc.Stroke = if ($isFocus) { $accent } else { $neutral }
  Set-Arc ([double]$remaining / [double]$s.durationMs)
  $time.Text = Format-Clock $remaining
  $kindTitle = switch ($s.kind) { 'focus' { 'Focus' } 'short' { 'Short break' } default { 'Long break' } }
  if ($s.paused) {
    $sub.Text = 'Paused'
    $glyph.Text = [string][char]0xE769
    $pauseBtn.Content = [string][char]0xE768
    $pauseBtn.ToolTip = 'Resume'
  } else {
    $sub.Text = if ($isFocus -and $s.label) { $s.label } else { $kindTitle }
    $glyph.Text = ''
    $pauseBtn.Content = [string][char]0xE769
    $pauseBtn.ToolTip = 'Pause'
  }
}

$pauseBtn.Add_Click({
  $s = Read-State
  if ($s -is [string] -or $null -eq $s -or $s.id -ne $Id) { return }
  $now = Get-NowMs
  if ($s.paused) {
    Set-Prop $s 'endAt' ($now + [long]$s.remainingMs)
    Set-Prop $s 'paused' $false
  } else {
    Set-Prop $s 'remainingMs' ([long]$s.endAt - $now)
    Set-Prop $s 'paused' $true
  }
  Save-State $s
  Update-View
})

$stopBtn.Add_Click({
  $s = Read-State
  if ($s -is [string] -or $null -eq $s -or $s.id -ne $Id) { $win.Close(); return }
  $now = Get-NowMs
  if (-not $s.paused) { Set-Prop $s 'remainingMs' ([long]$s.endAt - $now) }
  Set-Prop $s 'stoppedAt' $now
  Save-State $s
  $win.Close()
})

$hideBtn.Add_Click({
  if ($script:done) { $win.Close(); return }
  $s = Read-State
  if ($s -is [string] -or $null -eq $s -or $s.id -ne $Id) { return }
  Set-Prop $s 'overlay' $false
  Save-State $s
  Update-View
})

$card.Add_MouseLeftButtonDown({
  try { $win.DragMove() } catch {}
  try { [IO.File]::WriteAllText($posPath, ([string]::Format($inv, '{{"left":{0},"top":{1}}}', $win.Left, $win.Top)), $utf8) } catch {}
})
$card.Add_MouseEnter({ $controls.Visibility = 'Visible' })
$card.Add_MouseLeave({ $controls.Visibility = 'Collapsed' })
# Grow and shrink leftwards so the right edge stays put (the default spot is the bottom-right corner).
$win.Add_SizeChanged({ param($sender, $e) if ($e.WidthChanged -and $e.PreviousSize.Width -gt 0) { $win.Left -= ($e.NewSize.Width - $e.PreviousSize.Width) } })

$win.Add_Loaded({
  $area = [Windows.SystemParameters]::WorkArea
  $left = $area.Right - $win.ActualWidth - 8
  $top = $area.Bottom - $win.ActualHeight - 8
  try {
    $pos = [IO.File]::ReadAllText($posPath, $utf8) | ConvertFrom-Json
    $vl = [Windows.SystemParameters]::VirtualScreenLeft; $vt = [Windows.SystemParameters]::VirtualScreenTop
    $vw = [Windows.SystemParameters]::VirtualScreenWidth; $vh = [Windows.SystemParameters]::VirtualScreenHeight
    if ($pos.left -ge $vl -and $pos.top -ge $vt -and $pos.left -le ($vl + $vw - 60) -and $pos.top -le ($vt + $vh - 40)) {
      $left = $pos.left; $top = $pos.top
    }
  } catch {}
  $win.Left = $left
  $win.Top = $top
})

$timer = New-Object Windows.Threading.DispatcherTimer
$timer.Interval = [TimeSpan]::FromMilliseconds(250)
$timer.Add_Tick({ try { Update-View } catch { Write-Log ('tick error ' + $_.Exception.Message) } })

$first = Read-State
if ($null -eq $first -or $first -is [string] -or $first.id -ne $Id -or $first.stoppedAt) { Write-Log 'no session'; exit 0 }
Write-Log 'started'
$win.Add_ContentRendered({ Update-View; $timer.Start() })
# Show() plus a dispatcher loop instead of ShowDialog(): hiding a modal window ends
# ShowDialog, which would kill the timer (and its alarm) when the user hides it.
$win.Add_Closed({ [Windows.Threading.Dispatcher]::CurrentDispatcher.InvokeShutdown() })
$win.Show()
[Windows.Threading.Dispatcher]::Run()
Write-Log 'closed'
