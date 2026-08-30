import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const MACOS_FLOAT_PANEL_SCRIPT = `
tell application id "com.logos.desktop.logos" to activate

-- Wait for Logos process to be running and accessible
repeat with attempt from 1 to 20
  if application "Logos" is running then
    tell application "System Events"
      if exists (process "Logos") then
        exit repeat
      end if
    end tell
  end if
  delay 0.5
end repeat

-- Allow Logos time to process the deep link and focus the newly opened panel
delay 1.5

tell application "System Events"
  tell process "Logos"
    keystroke "f" using {command down, option down}
  end tell
end tell
`;

export const WINDOWS_FLOAT_PANEL_SCRIPT = `
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

$shell = New-Object -ComObject WScript.Shell
[void] $shell.AppActivate($logos.Id)
Start-Sleep -Milliseconds 1500
$shell.SendKeys('^{F11}')
`;

export async function floatActiveLogosPanel(platform: NodeJS.Platform = process.platform) {
  if (platform === "darwin") {
    await execFileAsync("/usr/bin/osascript", ["-e", MACOS_FLOAT_PANEL_SCRIPT]);
    return;
  }

  if (platform === "win32") {
    await execFileAsync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_FLOAT_PANEL_SCRIPT], {
      windowsHide: true,
    });
    return;
  }

  throw new Error("Floating Logos panels are supported only on macOS and Windows.");
}
