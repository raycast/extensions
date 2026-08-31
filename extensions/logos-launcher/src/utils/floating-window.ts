import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export function getMacOSFloatPanelScript(toolName?: string): string {
  const toolCheck = toolName
    ? `
-- Wait for the requested tool panel to receive focus if window title reflects it
set targetTool to "${toolName.replace(/"/g, '\\"')}"
set panelReady to false

repeat with attempt from 1 to 20
  tell application "System Events"
    tell process "Logos"
      try
        if exists front window then
          set currentTitle to name of front window
          if currentTitle contains targetTool then
            set panelReady to true
            exit repeat
          end if
        end if
        repeat with w in windows
          if name of w contains targetTool then
            perform action "AXRaise" of w
            set frontmost of process "Logos" to true
            delay 0.1
            if (name of front window) contains targetTool then
              set panelReady to true
              exit repeat
            end if
          end if
        end repeat
        if panelReady then exit repeat
      end try
    end tell
  end tell
  delay 0.25
end repeat

if not panelReady then
  error "Timed out waiting for " & targetTool & " panel to become active in Logos."
end if
`
    : `
-- Allow Logos time to process the deep link and focus the newly opened panel
delay 1.5
`;

  return `
tell application id "com.logos.desktop.logos" to activate

-- Wait for Logos process to be running and accessible
repeat with attempt from 1 to 20
  if application "Logos" is running then
    tell application "System Events"
      if exists (process "Logos") then
        if frontmost of process "Logos" then exit repeat
      end if
    end tell
  end if
  delay 0.25
end repeat
${toolCheck}
tell application "System Events"
  tell process "Logos"
    keystroke "f" using {command down, option down}
  end tell
end tell
`;
}

export function getWindowsFloatPanelScript(toolName?: string): string {
  const toolCheck = toolName
    ? `
$targetName = "${toolName.replace(/"/g, '`"')}"
$panelReady = $false

for ($i = 0; $i -lt 20; $i++) {
  $currentTitle = (Get-Process -Id $logos.Id -ErrorAction SilentlyContinue).MainWindowTitle
  if ($targetName -and $currentTitle -and $currentTitle -like "*$targetName*") {
    $panelReady = $true
    break
  }
  Start-Sleep -Milliseconds 250
}

if (-not $panelReady) {
  throw "Timed out waiting for $targetName panel to become active in Logos."
}
`
    : `
Start-Sleep -Milliseconds 1500
`;

  return `
$timeout = 10
$elapsed = 0
$logos = $null

while ($elapsed -lt $timeout) {
  $logos = Get-Process -Name "Logos" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 } | Select-Object -First 1
  if ($null -ne $logos) { break }
  $logos = Get-Process -Name "Logos" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($null -ne $logos) { break }
  Start-Sleep -Milliseconds 500
  $elapsed += 0.5
}

if ($null -eq $logos) {
  throw "Logos process not found."
}

try { [void] $logos.WaitForInputIdle(5000) } catch {}

$shell = New-Object -ComObject WScript.Shell
[void] $shell.AppActivate($logos.Id)
${toolCheck}
$shell.SendKeys('^{F11}')
`;
}

export const MACOS_FLOAT_PANEL_SCRIPT = getMacOSFloatPanelScript();
export const WINDOWS_FLOAT_PANEL_SCRIPT = getWindowsFloatPanelScript();

export async function floatActiveLogosPanel(
  toolName?: string | NodeJS.Platform,
  platform: NodeJS.Platform = process.platform,
) {
  let resolvedToolName: string | undefined;
  let resolvedPlatform = platform;

  if (typeof toolName === "string") {
    if (toolName === "darwin" || toolName === "win32" || toolName === "linux") {
      resolvedPlatform = toolName;
    } else {
      resolvedToolName = toolName;
    }
  }

  if (resolvedPlatform === "darwin") {
    const script = getMacOSFloatPanelScript(resolvedToolName);
    await execFileAsync("/usr/bin/osascript", ["-e", script]);
    return;
  }

  if (resolvedPlatform === "win32") {
    const script = getWindowsFloatPanelScript(resolvedToolName);
    await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
      windowsHide: true,
    });
    return;
  }

  throw new Error("Floating Logos panels are supported only on macOS and Windows.");
}
