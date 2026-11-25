param([Parameter(Mandatory=$true)][string]$RequestBase64)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class DiaWindows {
  public delegate bool Callback(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumWindows(Callback cb, IntPtr p);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
  public static IntPtr[] Handles() {
    var result = new List<IntPtr>();
    EnumWindows((h,p) => { if(IsWindowVisible(h)) result.Add(h); return true; }, IntPtr.Zero);
    return result.ToArray();
  }
}
'@
$walker = [System.Windows.Automation.TreeWalker]::ControlViewWalker
$scope = [System.Windows.Automation.TreeScope]
$ae = [System.Windows.Automation.AutomationElement]
$ct = [System.Windows.Automation.ControlType]
. (Join-Path $PSScriptRoot 'windows-ui.ps1')

function Children($element) {
  $child = $walker.GetFirstChild($element)
  while ($null -ne $child) { $child; $child = $walker.GetNextSibling($child) }
}
# Never search through web content for browser buttons: a page can spoof names/IDs.
function ChromeControls($element, $depth = 0) {
  if ($depth -gt 16) { return }
  foreach ($child in @(Children $element)) {
    $child
    if ($child.Current.ControlType -ne $ct::Document) { ChromeControls $child ($depth + 1) }
  }
}
function ById($window, $id) {
  $matches = @($window.Controls | Where-Object { $_.Current.AutomationId -eq $id })
  if ($matches.Count -ne 1) { throw "Dia control '$id' is unavailable or ambiguous. Open the sidebar and try again." }
  return $matches[0]
}
function InvokeControl($element) {
  $pattern = $element.GetCurrentPattern([System.Windows.Automation.InvokePattern]::Pattern)
  $pattern.Invoke()
}
function Windows($targetId) {
  $processes = @{}
  Get-Process Dia -ErrorAction SilentlyContinue | ForEach-Object { $processes[[int]$_.Id] = $_ }
  foreach ($handle in [DiaWindows]::Handles()) {
    [uint32]$processId = 0
    [void][DiaWindows]::GetWindowThreadProcessId($handle, [ref]$processId)
    if (-not $processes.ContainsKey([int]$processId)) { continue }
    $id = "$($handle.ToInt64()):$($processes[[int]$processId].StartTime.Ticks)"
    if ($targetId -and $id -cne $targetId) { continue }
    $element = $ae::FromHandle($handle)
    $controls = @(ChromeControls $element)
    if (-not (IsBrowserWindow $controls)) { continue }
    [pscustomobject]@{ Id=$id; Handle=$handle; Element=$element; Controls=$controls }
  }
}
function Refresh($window) { $window.Controls = @(ChromeControls $window.Element) }
function IsDiaWindowOpen($window) { return [DiaWindows]::IsWindow($window.Handle) }
function Foreground($window) {
  if ([DiaWindows]::IsIconic($window.Handle)) { [void][DiaWindows]::ShowWindow($window.Handle, 9) }
  [void][DiaWindows]::SetForegroundWindow($window.Handle)
  WaitForDiaCondition { [DiaWindows]::GetForegroundWindow() -eq $window.Handle } 'Could not focus Dia. Activate its window and try again.'
}
function Spaces($window) {
  $container = ById $window 'SpacesScrollViewer'
  $children = @(Children $container)
  $lists = @($children | Where-Object { $_.Current.AutomationId -eq 'TabListScrollViewer' })
  $buttons = @($children | Where-Object { $_.Current.ControlType -eq $ct::Button -and -not $_.Current.AutomationId -and $_.Current.Name })
  $visibleLists = @($lists | Where-Object { -not $_.Current.IsOffscreen })
  if ($visibleLists.Count -ne 1 -or $buttons.Count -eq 0) { throw 'This Dia sidebar layout is not supported. Open the sidebar and try again.' }
  $switcher = ById $window 'SpaceSwitcherButton'
  $activeNames = @((Children $switcher) | Where-Object { $_.Current.ControlType -eq $ct::Text } | ForEach-Object { $_.Current.Name })
  if ($activeNames.Count -ne 1) { throw 'Could not identify the active Dia space.' }
  for ($i=0; $i -lt $buttons.Count; $i++) {
    $isActive = $buttons[$i].Current.Name -eq $activeNames[0]
    [pscustomobject]@{ Name=$buttons[$i].Current.Name; Active=$isActive; Button=$buttons[$i]; List=$(if ($isActive) { $visibleLists[0] } else { $null }) }
  }
}
function Document($window) {
  $docs = @($window.Controls | Where-Object { $_.Current.ControlType -eq $ct::Document -and -not $_.Current.IsOffscreen })
  if ($docs.Count -ne 1) { throw 'Dia must show one readable page (close split views or panels and try again).' }
  return $docs[0]
}
function Tabs($window, $spaces = @(Spaces $window)) {
  foreach ($space in $spaces) {
    if (-not $space.Active) { continue }
    $items = $space.List.FindAll($scope::Descendants, (New-Object System.Windows.Automation.PropertyCondition($ae::ControlTypeProperty, $ct::ListItem)))
    foreach ($item in $items) {
      $selection = $null
      if (-not $item.TryGetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern, [ref]$selection)) { continue }
      $selected = $selection.Current.IsSelected -and $space.Active
      $url = $null
      if ($selected) {
        try { $url = ((Document $window).GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)).Current.Value } catch { }
      }
      [pscustomobject]@{
        windowId=$window.Id; tabId=($window.Id + '/' + ($item.GetRuntimeId() -join '.'))
        title=$item.Current.Name; url=$url; isPinned=$false; isFocused=$selected
        space=$space.Name; isActiveSpace=$space.Active; Element=$item; SpaceControl=$space.Button
      }
    }
  }
}
function PublicTab($tab) { $tab | Select-Object windowId,tabId,title,url,isPinned,isFocused,space,isActiveSpace }
function SelectTab($window, $tabId) {
  Foreground $window
  # Resolve once after foregrounding, when the active space and controls are current.
  Refresh $window
  $current = @(Tabs $window | Where-Object { $_.tabId -ceq $tabId })
  if ($current.Count -ne 1) { throw 'TAB_NOT_FOUND: Tab changed or closed. Refresh the tab list.' }
  if ($current[0].isFocused) { return }
  InvokeControl $current[0].Element
  WaitForDiaCondition {
    try {
      $pattern = $current[0].Element.GetCurrentPattern([System.Windows.Automation.SelectionItemPattern]::Pattern)
      return $pattern.Current.IsSelected
    } catch {
      # The provider can replace the selected control during a layout change.
    }
    Refresh $window
    return @(Tabs $window | Where-Object { $_.tabId -ceq $tabId -and $_.isFocused }).Count -eq 1
  } 'Dia did not select the requested tab. Refresh the tab list.'
}
function MenuItem($window, $name) {
  Foreground $window
  Refresh $window
  $items = @($window.Controls | Where-Object { $_.Current.ControlType -eq $ct::MenuItem -and $_.Current.Name -eq $name })
  if ($items.Count -eq 0) {
    InvokeControl (ById $window 'AppMenuButton'); Start-Sleep -Milliseconds 100; Refresh $window
    $items = @($window.Controls | Where-Object { $_.Current.ControlType -eq $ct::MenuItem -and $_.Current.Name -eq $name })
  }
  if ($items.Count -ne 1) { throw "Dia menu item '$name' is unavailable. This experimental backend currently requires English menus." }
  return $items[0]
}
function RunOperation($request, $windows, $window) {
  $result = $null
  switch ($request.operation) {
    'search-tabs' {
      $rows = New-Object 'System.Collections.Generic.List[object]'
      $names = @(); $active = @{}; $skipped = 0
      foreach ($w in $windows) {
        try {
          $snapshot = WithSidebar $w { SearchWindowSpaces $w }
          foreach ($row in $snapshot.tabs) { $rows.Add($row) }
          foreach ($s in $snapshot.spaces) {
            if ($names -notcontains $s.Name) { $names += $s.Name }
            if ($s.Active) { $active[$w.Id] = $s.Name }
          }
        } catch {
          if ($_.Exception.Message -like '*could not be restored*') { throw }
          $skipped++
          $lastError = $_
        }
      }
      if ($skipped -eq $windows.Count) { throw $lastError }
      $result = @{ tabs=$rows.ToArray(); spaces=@{ names=$names; activeByWindow=$active }; skipped=$skipped }
    }
    'tabs' {
      if ($request.allSpaces) { throw "Windows UI Automation can list tabs only in each window's active space. Switch spaces first." }
      $result = @($windows | ForEach-Object { $w = $_; WithSidebar $w { Tabs $w | ForEach-Object { PublicTab $_ } } })
    }
    'focused-tab' { $result = Tabs $window | Where-Object isFocused | Select-Object -First 1 | ForEach-Object { PublicTab $_ } }
    'spaces' {
      $names = @(); $active = @{}
      foreach ($w in $windows) { foreach ($s in @(WithSidebar $w { Spaces $w })) { if ($names -notcontains $s.Name) { $names += $s.Name }; if ($s.Active) { $active[$w.Id] = $s.Name } } }
      $result = @{ names=$names; activeByWindow=$active }
    }
    'switch-space' {
      Foreground $window
      ShowDiaSpace $window $request.space
      $result = $true
    }
    { $_ -in 'focus-tab','close-tab','read-tab' } {
      if ($request.space) { ShowDiaSpace $window $request.space }
      SelectTab $window $request.tabId
      if ($request.operation -eq 'close-tab') {
        CloseTabControl $window $request.tabId
        $result = $true
      } elseif ($request.operation -eq 'read-tab') {
        $doc = Document $window
        $limit = [Math]::Min(50000, [Math]::Max(1, [int]$request.maxLength))
        $text = ($doc.GetCurrentPattern([System.Windows.Automation.TextPattern]::Pattern)).DocumentRange.GetText($limit + 1)
        if ([string]::IsNullOrWhiteSpace($text)) { throw 'This page has no accessible text, or is still loading. Try again after it loads.' }
        $result = @{ tabId=$request.tabId; title=$doc.Current.Name; url=($doc.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern)).Current.Value; text=$text.Substring(0,[Math]::Min($limit,$text.Length)); truncated=($text.Length -gt $limit); loading=$false }
      } else { $result = $true }
    }
    { $_ -in 'new-tab','new-window','new-incognito-window' } {
      if ($request.profile) { throw 'Creating a window in a specified profile is not supported by the PowerShell backend yet.' }
      $labels = @{ 'new-tab'='New tab'; 'new-window'='New window'; 'new-incognito-window'='New incognito window' }
      InvokeControl (MenuItem $window $labels[$request.operation]); $result = $true
    }
    default { throw 'Unknown Dia automation operation.' }
  }
  return $result
}
$mutex = New-Object System.Threading.Mutex($false, 'Local\RaycastDiaAutomation')
$ownsMutex = $false
try {
  try { $ownsMutex = $mutex.WaitOne(2000) } catch [System.Threading.AbandonedMutexException] { $ownsMutex = $true }
  if (-not $ownsMutex) { throw 'Another Dia automation action is running. Try again in a moment.' }
  $request = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($RequestBase64)) | ConvertFrom-Json
  $windows = @(Windows $request.windowId)
  if ($request.windowId -and $windows.Count -eq 0) { throw 'TAB_NOT_FOUND: The Dia window has closed. Refresh and try again.' }
  if ($windows.Count -eq 0) { throw 'No Dia window is open. Open Dia and try again.' }
  $window = $windows | Where-Object { $_.Handle -eq [DiaWindows]::GetForegroundWindow() } | Select-Object -First 1
  if (-not $window) { $window = $windows[0] }
  if ($request.windowId) {
    $window = $windows | Where-Object { $_.Id -eq $request.windowId } | Select-Object -First 1
    if (-not $window) { throw 'TAB_NOT_FOUND: The Dia window has closed. Refresh and try again.' }
  }
  if ($request.operation -in 'focused-tab','switch-space','focus-tab','close-tab','read-tab') {
    $result = WithSidebar $window { RunOperation $request $windows $window }
  } else {
    $result = RunOperation $request $windows $window
  }
  # PowerShell unwraps singleton/empty arrays returned by functions.
  if ($request.operation -eq 'tabs') { $result = @($result | Where-Object { $null -ne $_ }) }
  @{ok=$true; result=$result} | ConvertTo-Json -Depth 10 -Compress
} catch {
  @{ok=$false; error=$_.Exception.Message} | ConvertTo-Json -Compress
  exit 1
} finally {
  if ($ownsMutex) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
