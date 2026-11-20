param([Parameter(Mandatory=$true)][string]$RequestBase64)
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
Add-Type -AssemblyName System.Windows.Forms
Add-Type @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class DiaWindows {
  public delegate bool Callback(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumWindows(Callback cb, IntPtr p);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
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
function Windows {
  $processes = @{}
  Get-Process Dia -ErrorAction SilentlyContinue | ForEach-Object { $processes[[int]$_.Id] = $_ }
  foreach ($handle in [DiaWindows]::Handles()) {
    [uint32]$processId = 0
    [void][DiaWindows]::GetWindowThreadProcessId($handle, [ref]$processId)
    if (-not $processes.ContainsKey([int]$processId)) { continue }
    $element = $ae::FromHandle($handle)
    $controls = @(ChromeControls $element)
    if (-not ($controls | Where-Object { $_.Current.AutomationId -eq 'SidebarToggleButton' })) { continue }
    $id = "$($handle.ToInt64()):$($processes[[int]$processId].StartTime.Ticks)"
    [pscustomobject]@{ Id=$id; Handle=$handle; Element=$element; Controls=$controls }
  }
}
function Refresh($window) { $window.Controls = @(ChromeControls $window.Element) }
function Foreground($window) {
  if ([DiaWindows]::IsIconic($window.Handle)) { [void][DiaWindows]::ShowWindow($window.Handle, 9) }
  [void][DiaWindows]::SetForegroundWindow($window.Handle)
  Start-Sleep -Milliseconds 100
  if ([DiaWindows]::GetForegroundWindow() -ne $window.Handle) { throw 'Could not focus Dia. Activate its window and try again.' }
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
function Tabs($window) {
  foreach ($space in @(Spaces $window)) {
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
function SelectTab($window, $tab) {
  Foreground $window
  if (-not $tab.isActiveSpace) { InvokeControl $tab.SpaceControl; Start-Sleep -Milliseconds 150 }
  # Resolve the runtime ID again after switching; never substitute a matching title.
  Refresh $window
  $current = @(Tabs $window | Where-Object { $_.tabId -eq $tab.tabId })
  if ($current.Count -ne 1) { throw 'TAB_NOT_FOUND: Tab changed or closed. Refresh the tab list.' }
  InvokeControl $current[0].Element
  Start-Sleep -Milliseconds 150
  Refresh $window
  $selected = @(Tabs $window | Where-Object { $_.tabId -eq $tab.tabId -and $_.isFocused })
  if ($selected.Count -ne 1) { throw 'Dia did not select the requested tab.' }
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
$mutex = New-Object System.Threading.Mutex($false, 'Local\RaycastDiaAutomation')
$ownsMutex = $false
try {
  try { $ownsMutex = $mutex.WaitOne(2000) } catch [System.Threading.AbandonedMutexException] { $ownsMutex = $true }
  if (-not $ownsMutex) { throw 'Another Dia automation action is running. Try again in a moment.' }
  $request = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($RequestBase64)) | ConvertFrom-Json
  $windows = @(Windows)
  if ($windows.Count -eq 0) { throw 'No Dia window is open. Open Dia and try again.' }
  $window = $windows | Where-Object { $_.Handle -eq [DiaWindows]::GetForegroundWindow() } | Select-Object -First 1
  if (-not $window) { $window = $windows[0] }
  if ($request.windowId) {
    $window = $windows | Where-Object { $_.Id -eq $request.windowId } | Select-Object -First 1
    if (-not $window) { throw 'TAB_NOT_FOUND: The Dia window has closed. Refresh and try again.' }
  }
  $result = $null
  switch ($request.operation) {
    'tabs' {
      if ($request.allSpaces) { throw "Windows UI Automation can list tabs only in each window's active space. Switch spaces first." }
      $result = @($windows | ForEach-Object { Tabs $_ } | Where-Object { $request.allSpaces -or $_.isActiveSpace } | ForEach-Object { PublicTab $_ })
    }
    'focused-tab' { $result = Tabs $window | Where-Object isFocused | Select-Object -First 1 | ForEach-Object { PublicTab $_ } }
    'spaces' {
      $names = @(); $active = @{}
      foreach ($w in $windows) { foreach ($s in @(Spaces $w)) { if ($names -notcontains $s.Name) { $names += $s.Name }; if ($s.Active) { $active[$w.Id] = $s.Name } } }
      $result = @{ names=$names; activeByWindow=$active }
    }
    'switch-space' {
      $matches = @(Spaces $window | Where-Object { $_.Name -ceq $request.space })
      if ($matches.Count -ne 1) { throw 'Space is missing or ambiguous. Refresh the spaces list.' }
      Foreground $window; InvokeControl $matches[0].Button; Start-Sleep -Milliseconds 150; Refresh $window
      if (-not (Spaces $window | Where-Object { $_.Name -ceq $request.space -and $_.Active })) { throw 'Dia did not switch to the requested space.' }
      $result = $true
    }
    { $_ -in 'focus-tab','close-tab','read-tab' } {
      $matches = @(Tabs $window | Where-Object { $_.tabId -ceq $request.tabId })
      if ($matches.Count -ne 1) { throw 'TAB_NOT_FOUND: Tab changed or closed. Refresh the tab list.' }
      SelectTab $window $matches[0]
      if ($request.operation -eq 'close-tab') {
        if ([DiaWindows]::GetForegroundWindow() -ne $window.Handle) { throw 'Dia lost focus. Nothing was closed.' }
        [System.Windows.Forms.SendKeys]::SendWait('^w'); Start-Sleep -Milliseconds 150; Refresh $window
        if (Tabs $window | Where-Object { $_.tabId -ceq $request.tabId }) { throw 'Dia did not close the tab.' }
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
  @{ok=$true; result=$result} | ConvertTo-Json -Depth 10 -Compress
} catch {
  @{ok=$false; error=$_.Exception.Message} | ConvertTo-Json -Compress
  exit 1
} finally {
  if ($ownsMutex) { $mutex.ReleaseMutex() }
  $mutex.Dispose()
}
