import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const MACOS_FLOAT_PANEL_SCRIPT = `
tell application id "com.logos.desktop.logos" to activate
delay 1
tell application "System Events"
  tell process "Logos"
    keystroke "f" using {command down, option down}
  end tell
end tell
`;

export const WINDOWS_FLOAT_PANEL_SCRIPT = `
$logos = Get-Process -Name "Logos" -ErrorAction Stop | Select-Object -First 1
$shell = New-Object -ComObject WScript.Shell
[void] $shell.AppActivate($logos.Id)
Start-Sleep -Milliseconds 1000
$shell.SendKeys('^{F11}')
`;

export async function floatActiveLogosPanel(platform: NodeJS.Platform = process.platform) {
  if (platform === "darwin") {
    await execFileAsync("/usr/bin/osascript", ["-e", MACOS_FLOAT_PANEL_SCRIPT]);
    return;
  }

  if (platform === "win32") {
    await execFileAsync(
      "powershell.exe",
      ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_FLOAT_PANEL_SCRIPT],
      { windowsHide: true },
    );
    return;
  }

  throw new Error("Floating Logos panels are supported only on macOS and Windows.");
}
