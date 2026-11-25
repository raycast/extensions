# UI operations are kept separate from process discovery so they can be tested
# with fake controls, without opening or changing a real browser.
function IsBrowserWindow($controls) {
  $ids = @($controls | ForEach-Object { $_.Current.AutomationId })
  if ($ids -contains 'SidebarToggleButton') { return $true }
  if ($ids -notcontains 'AppMenuButton') { return $false }
  return @($controls | Where-Object { $_.Current.ControlType -eq $ct::Document -and -not $_.Current.IsOffscreen }).Count -gt 0
}

function WaitForDiaCondition($condition, $message) {
  $timer = [Diagnostics.Stopwatch]::StartNew()
  do {
    if (& $condition) { return }
    Start-Sleep -Milliseconds 50
  } while ($timer.ElapsedMilliseconds -lt 1500)
  throw $message
}

function SidebarVisible($window) {
  Refresh $window
  $containers = @($window.Controls | Where-Object { $_.Current.AutomationId -eq 'SpacesScrollViewer' -and -not $_.Current.IsOffscreen })
  if ($containers.Count -eq 1) { return $true }
  if ($containers.Count -gt 1) { throw 'Dia sidebar is ambiguous. Nothing was toggled.' }
  $toggle = ById $window 'SidebarToggleButton'
  $pattern = $null
  if ($toggle.TryGetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern, [ref]$pattern)) {
    if ($pattern.Current.ToggleState -eq [System.Windows.Automation.ToggleState]::Off) { return $false }
  }
  # Do not infer hidden state just from a missing container: startup, dialogs,
  # or an unsupported layout could otherwise cause us to hide a visible sidebar.
  if ($toggle.Current.Name -eq 'Show sidebar') { return $false }
  throw 'Cannot determine Dia sidebar visibility. Show the sidebar manually and retry.'
}

function SetSidebarVisible($window, [bool]$visible) {
  if ((SidebarVisible $window) -eq $visible) { return }
  $toggle = ById $window 'SidebarToggleButton'
  $pattern = $null
  if ($toggle.TryGetCurrentPattern([System.Windows.Automation.TogglePattern]::Pattern, [ref]$pattern)) {
    $pattern.Toggle()
  } else {
    InvokeControl $toggle
  }
  WaitForDiaCondition {
    try { return (SidebarVisible $window) -eq $visible } catch { return $false }
  } 'Dia did not change sidebar visibility. Show the sidebar manually and retry.'
}

function WithSidebar($window, $action) {
  $restoreHidden = -not (SidebarVisible $window)
  try {
    if ($restoreHidden) { SetSidebarVisible $window $true }
    & $action
  } finally {
    # Runs on action errors and reveal timeouts too. Do not touch windows that
    # closed when their last tab was closed.
    if ($restoreHidden -and (IsDiaWindowOpen $window)) {
      try { SetSidebarVisible $window $false } catch {
        throw 'The Dia action may have completed, but its hidden sidebar could not be restored. Hide it manually and refresh before retrying.'
      }
    }
  }
}

function ShowDiaSpace($window, $name) {
  Refresh $window
  $target = @(Spaces $window | Where-Object { $_.Name -ceq $name })
  if ($target.Count -ne 1) { throw 'Space is missing or ambiguous. Refresh the spaces list.' }
  if ($target[0].Active) { return }
  InvokeControl $target[0].Button
  WaitForDiaCondition {
    Refresh $window
    return @(Spaces $window | Where-Object { $_.Name -ceq $name -and $_.Active }).Count -eq 1
  } 'Dia did not switch to the requested space.'
}

function SearchWindowSpaces($window) {
  $spaces = @(Spaces $window)
  $original = @($spaces | Where-Object Active)
  if ($original.Count -ne 1) { throw 'Cannot identify the current Dia space.' }
  $rows = New-Object 'System.Collections.Generic.List[object]'
  $visitedOther = $false
  try {
    foreach ($s in @($original[0]) + @($spaces | Where-Object { -not $_.Active })) {
      if (-not $s.Active) {
        $visitedOther = $true
        ShowDiaSpace $window $s.Name
      }
      foreach ($tab in @(Tabs $window)) {
        $row = PublicTab $tab
        $row.isActiveSpace = $s.Active
        if (-not $s.Active) { $row.isFocused = $false }
        $rows.Add($row)
      }
    }
  } finally {
    if ($visitedOther) {
      try { ShowDiaSpace $window $original[0].Name }
      catch { throw 'The original Dia space could not be restored. Switch back manually.' }
    }
  }
  return @{ spaces=$spaces; tabs=$rows.ToArray() }
}

function CloseTabControl($window, $tabId) {
  Refresh $window
  $before = @(Tabs $window)
  $tabs = @($before | Where-Object { $_.tabId -ceq $tabId -and $_.isFocused })
  if ($tabs.Count -ne 1) { throw 'TAB_NOT_FOUND: Tab changed or closed. Refresh the tab list.' }
  # Scope the close button to this exact tab. Never send a customizable shortcut
  # or select a global Close button (which might belong to a panel/window).
  $buttons = @(ChromeControls $tabs[0].Element | Where-Object {
    $_.Current.ControlType -eq $ct::Button -and $_.Current.Name -eq 'Close tab' -and $_.Current.IsEnabled
  })
  if ($buttons.Count -ne 1) { throw 'The selected tab does not expose one Close tab button. Close it in Dia; no keyboard shortcut was sent. English controls are currently required.' }
  InvokeControl $buttons[0]
  WaitForDiaCondition {
    if (-not (IsDiaWindowOpen $window)) { return $before.Count -eq 1 }
    Refresh $window
    $after = @(Tabs $window)
    if ($after.Count -ne $before.Count - 1) { return $false }
    $remaining = @($after | ForEach-Object { $_.tabId })
    foreach ($old in $before) {
      if ($old.tabId -ceq $tabId) { continue }
      if ($remaining -cnotcontains $old.tabId) { return $false }
    }
    return $remaining -cnotcontains $tabId
  } 'Could not verify which tab closed. Refresh and check the remaining tabs before retrying.'
}
