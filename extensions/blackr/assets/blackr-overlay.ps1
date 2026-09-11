param(
  [string]$DurationSeconds
)

$DefaultDurationSeconds = 60
$MinDurationSeconds = 10
$MaxDurationSeconds = 600

function Get-NormalizedDuration {
  param([string]$Value)

  $ParsedValue = 0
  if (-not [int]::TryParse($Value, [ref]$ParsedValue)) {
    return $DefaultDurationSeconds
  }

  return [Math]::Min([Math]::Max($ParsedValue, $MinDurationSeconds), $MaxDurationSeconds)
}

Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Windows.Forms

$Duration = Get-NormalizedDuration -Value $DurationSeconds
$Screen = [System.Windows.Forms.Screen]::PrimaryScreen
$Bounds = $Screen.Bounds
$EndAt = [DateTime]::UtcNow.AddSeconds($Duration)

$Form = New-Object System.Windows.Forms.Form
$Form.Text = "Blackr"
$Form.StartPosition = [System.Windows.Forms.FormStartPosition]::Manual
$Form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
$Form.BackColor = [System.Drawing.Color]::Black
$Form.Bounds = $Bounds
$Form.TopMost = $true
$Form.KeyPreview = $true
$Form.ShowInTaskbar = $false

$ExitButton = New-Object System.Windows.Forms.Button
$ExitButton.Text = "Exit"
$ExitButton.Width = 96
$ExitButton.Height = 34
$ExitButton.Left = [Math]::Floor(($Bounds.Width - $ExitButton.Width) / 2)
$ExitButton.Top = $Bounds.Height - 78
$ExitButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$ExitButton.ForeColor = [System.Drawing.Color]::FromArgb(184, 255, 255, 255)
$ExitButton.BackColor = [System.Drawing.Color]::FromArgb(26, 255, 255, 255)
$ExitButton.FlatAppearance.BorderColor = [System.Drawing.Color]::FromArgb(41, 255, 255, 255)
$ExitButton.FlatAppearance.MouseOverBackColor = [System.Drawing.Color]::FromArgb(38, 255, 255, 255)
$ExitButton.FlatAppearance.MouseDownBackColor = [System.Drawing.Color]::FromArgb(50, 255, 255, 255)
$ExitButton.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$ExitButton.Add_Click({
  $Form.Close()
})

$Timer = New-Object System.Windows.Forms.Timer
$Timer.Interval = 50
$Timer.Add_Tick({
  if ([DateTime]::UtcNow -ge $EndAt) {
    $Timer.Stop()
    $Form.Close()
  }
})

$Form.Add_KeyDown({
  param($Sender, $Event)

  if ($Event.KeyCode -eq [System.Windows.Forms.Keys]::Escape) {
    $Form.Close()
  }
})

$Form.Controls.Add($ExitButton)
$Form.Add_Shown({
  $Form.Activate()
  $ExitButton.Focus()
  $Timer.Start()
})
$Form.Add_FormClosed({
  $Timer.Stop()
  $Timer.Dispose()
})

[System.Windows.Forms.Application]::EnableVisualStyles()
[System.Windows.Forms.Application]::Run($Form)
