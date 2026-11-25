# Behavioral tests using fake controls only. Never connects to a browser.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName UIAutomationClient
Add-Type -AssemblyName UIAutomationTypes
$ct = [System.Windows.Automation.ControlType]
. (Join-Path $PSScriptRoot '../assets/windows-ui.ps1')

function Assert($condition, $message) { if (-not $condition) { throw $message } }
function ExpectError($action, $pattern) {
  $caught = $null
  try { & $action | Out-Null } catch { $caught = $_.Exception.Message }
  Assert ($caught -match $pattern) "Expected '$pattern', got '$caught'"
}

# Exercise the real visibility detector against fake accessibility controls.
function Refresh($window) {}
function ById($window, $id) { return $window.Toggle }
$toggle = [pscustomobject]@{ Current = [pscustomobject]@{ Name = 'Show sidebar' } }
$toggle | Add-Member ScriptMethod TryGetCurrentPattern { param($pattern, $output) return $false }
$window = [pscustomobject]@{ Controls = @(); Toggle = $toggle }
Assert (-not (SidebarVisible $window)) 'Explicit hidden state should be recognized'
$toggle.Current.Name = 'Sidebar'
ExpectError { SidebarVisible $window } 'Cannot determine'
$window.Controls = @([pscustomobject]@{ Current = [pscustomobject]@{ AutomationId = 'SpacesScrollViewer'; IsOffscreen = $false } })
Assert (SidebarVisible $window) 'Visible container should be recognized'
$window.Controls += $window.Controls[0]
ExpectError { SidebarVisible $window } 'ambiguous'

# Isolate lifecycle behavior from accessibility and timing.
function SidebarVisible($window) { return $script:visible }
function SetSidebarVisible($window, [bool]$visible) {
  $script:changes.Add($visible)
  $script:visible = $visible
  if ($script:failReveal -and $visible) { throw 'Reveal timeout' }
  if ($script:failRestore -and -not $visible) { throw 'Restore timeout' }
}
function IsDiaWindowOpen($window) { return $script:open }
function Reset {
  $script:visible = $false; $script:open = $true
  $script:failReveal = $false; $script:failRestore = $false
  $script:changes = New-Object 'System.Collections.Generic.List[bool]'
}
Reset
$value = WithSidebar $window { Assert $script:visible 'Action needs visible sidebar'; 'result' }
Assert ($value -eq 'result' -and -not $script:visible -and $script:changes.Count -eq 2) 'Hidden sidebar should be restored after success'
Reset
ExpectError { WithSidebar $window { throw 'Action failed' } } 'Action failed'
Assert (-not $script:visible -and $script:changes.Count -eq 2) 'Restore after action failure'
Reset
$script:failReveal = $true
ExpectError { WithSidebar $window { throw 'Must not run' } } 'Reveal timeout'
Assert (-not $script:visible -and $script:changes.Count -eq 2) 'Restore after partial reveal'
Reset
$script:visible = $true
WithSidebar $window { 'ok' } | Out-Null
Assert ($script:visible -and $script:changes.Count -eq 0) 'Visible sidebar must remain untouched'
Reset
WithSidebar $window { $script:open = $false } | Out-Null
Assert ($script:changes.Count -eq 1) 'Do not restore a closed window'
Reset
$script:failRestore = $true
ExpectError { WithSidebar $window { 'ok' } } 'may have completed'

# Close only the uniquely identified tab control; verify completion by ID.
function Tabs($window) { return $script:tabs }
function ChromeControls($element) { return $script:buttons }
function InvokeControl($element) { $script:invocations++; $script:tabs = @() }
function WaitForDiaCondition($condition, $message) { if (-not (& $condition)) { throw $message } }
function ResetClose {
  Reset
  $script:invocations = 0
  $script:tabs = @([pscustomobject]@{ tabId = 'exact-id'; isFocused = $true; Element = 'tab' })
  $script:buttons = @([pscustomobject]@{ Current = [pscustomobject]@{ ControlType = $ct::Button; Name = 'Close tab'; IsEnabled = $true } })
}
ResetClose
CloseTabControl $window 'exact-id'
Assert ($script:invocations -eq 1) 'Close the exact tab once'
ResetClose
ExpectError { CloseTabControl $window 'stale-id' } 'TAB_NOT_FOUND'
Assert ($script:invocations -eq 0) 'Do not close a stale ID'
ResetClose
$script:tabs[0].isFocused = $false
ExpectError { CloseTabControl $window 'exact-id' } 'TAB_NOT_FOUND'
Assert ($script:invocations -eq 0) 'Do not close a tab after selection changed'
ResetClose
$script:buttons += $script:buttons[0]
ExpectError { CloseTabControl $window 'exact-id' } 'does not expose one'
Assert ($script:invocations -eq 0) 'Ambiguous controls must not be invoked'
ResetClose
$script:buttons[0].Current.Name = 'Close window'
ExpectError { CloseTabControl $window 'exact-id' } 'does not expose one'
Assert ($script:invocations -eq 0) 'Never substitute a window close button'
ResetClose
$script:buttons[0].Current.IsEnabled = $false
ExpectError { CloseTabControl $window 'exact-id' } 'does not expose one'
Assert ($script:invocations -eq 0) 'Never invoke a disabled close button'

# Load only the dispatcher from the real entrypoint, never its startup/UI code.
$parseErrors = $null; $tokens = $null
$ast = [System.Management.Automation.Language.Parser]::ParseFile(
  (Join-Path $PSScriptRoot '../assets/windows-automation.ps1'), [ref]$tokens, [ref]$parseErrors)
Assert ($parseErrors.Count -eq 0) 'Entrypoint must parse in Windows PowerShell'
$dispatcher = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'RunOperation' }, $true)
. ([scriptblock]::Create($dispatcher.Extent.Text))
function PublicTab($tab) { return $tab | Select-Object tabId,title,space,isActiveSpace,isFocused }
function MenuItem($window, $name) { return $name }
ResetClose
$script:visible = $false
$listed = @(RunOperation ([pscustomobject]@{ operation = 'tabs'; allSpaces = $false }) @($window) $window)
Assert ($listed.Count -eq 1 -and $listed[0].tabId -eq 'exact-id') 'Dispatcher should return tabs'
Assert (-not $script:visible -and $script:changes.Count -eq 2) 'Tab listing should restore hidden sidebar'
ResetClose
RunOperation ([pscustomobject]@{ operation = 'new-tab' }) @($window) $window | Out-Null
Assert ($script:invocations -eq 1 -and $script:changes.Count -eq 0) 'New tab should not toggle sidebar'
# Exercise the dispatcher's selection and close paths against duplicate titles.
$selectFunction = $ast.Find({ param($node) $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and $node.Name -eq 'SelectTab' }, $true)
. ([scriptblock]::Create($selectFunction.Extent.Text))
function Foreground($window) {}
function ChromeControls($element) {
  [pscustomobject]@{ Current = $script:buttons[0].Current; Owner = $element }
}
function InvokeControl($element) {
  $script:invocations++
  if ($element -is [string]) {
    foreach ($t in $script:tabs) { $t.isFocused = $t.Element -ceq $element }
  } else {
    $script:tabs = @($script:tabs | Where-Object { $_.Element -cne $element.Owner })
  }
}
ResetClose
$script:tabs = @(
  [pscustomobject]@{ title='Same'; tabId='one'; Element='first'; isFocused=$true }
  [pscustomobject]@{ title='Same'; tabId='two'; Element='second'; isFocused=$false }
)
$request = @{ operation='focus-tab'; tabId='one' }
WithSidebar $window { RunOperation $request @($window) $window } | Out-Null
Assert ($script:invocations -eq 0) 'Already selected tab needs no invocation'
$request = @{ operation='close-tab'; tabId='two' }
WithSidebar $window { RunOperation $request @($window) $window } | Out-Null
Assert ($script:tabs.Count -eq 1 -and $script:tabs[0].tabId -eq 'one') 'Keep the other same-title tab'
Assert (-not $script:visible -and $script:invocations -eq 2) 'Select and close the target and restore the hidden sidebar'
# A sidebar rebuild can invalidate the target ID without closing any tab.
function InvokeControl($element) {
  foreach ($t in $script:tabs) { $t.tabId += '-rebuilt' }
}
ResetClose
ExpectError { CloseTabControl $window 'exact-id' } 'Could not verify which tab closed'

function Spaces($window) {
  if ($window.Id -eq 'unsupported') { throw 'Unsupported layout' }
  [pscustomobject]@{ Name='Work'; Active=$true }
}
$windows = @(@{Id='readable'}, @{Id='unsupported'})
$snapshot = RunOperation @{operation='search-tabs'} $windows $windows[0]
Assert ($snapshot.tabs.Count -eq 1 -and $snapshot.skipped -eq 1) 'Keep readable windows when another layout fails'
Assert ($snapshot.spaces.activeByWindow.readable -eq 'Work') 'Return space metadata with the same snapshot'
Assert (-not $script:visible) 'Restore the hidden sidebar even on a skipped window'
ExpectError { RunOperation @{operation='search-tabs'} @($windows[1]) $windows[1] } 'Unsupported layout'
# Dia only exposes tabs for the currently shown space.
$script:shownSpace = 'Personal'
function Spaces($window) {
  foreach ($name in 'Work','Personal','Empty') {
    [pscustomobject]@{ Name=$name; Active=($name -eq $script:shownSpace); Button=$name }
  }
}
function InvokeControl($button) { $script:shownSpace = $button }
function Tabs($window) {
  if ($script:shownSpace -eq $script:failingSpace) { throw 'Could not list space' }
  if ($script:shownSpace -ne 'Empty') {
    [pscustomobject]@{ tabId=$script:shownSpace; title='Same'; space=$script:shownSpace; isFocused=$true; isActiveSpace=$true }
  }
}
$snapshot = SearchWindowSpaces $window
Assert ($snapshot.tabs.Count -eq 2 -and $snapshot.spaces.Count -eq 3) 'Include inactive tabs and empty spaces'
Assert ($snapshot.tabs[1].space -eq 'Work' -and -not $snapshot.tabs[1].isActiveSpace -and -not $snapshot.tabs[1].isFocused) 'Label using the original active space'
Assert ($script:shownSpace -eq 'Personal') 'Restore Personal after searching all spaces'
$script:failingSpace = 'Work'
ExpectError { SearchWindowSpaces $window } 'Could not list space'
Assert ($script:shownSpace -eq 'Personal') 'Restore Personal when another space fails'
Write-Output 'Windows UI behavioral tests passed.'
