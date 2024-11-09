import { exec } from "child_process";
import { open, showHUD } from "@raycast/api";
import { preferences } from "./intervals";

const DNDshortcutName = `DND Pomodoro`;

function executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    if (!preferences.enableFocusWhileFocused) {
      return;
    }
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout, stderr });
      }
    });
  });
}

export async function turnOnDND() {
  await executeCommand(`echo "on" | shortcuts run "${DNDshortcutName}"`);
  const isOn = await getDNDStatus();
  if (isOn) {
    await showHUD(`Do Not Disturb is on`);
  }
}

export async function turnOffDND() {
  await executeCommand(`echo "off" | shortcuts run "${DNDshortcutName}"`);
  const isOn = await getDNDStatus();
  if (!isOn) {
    await showHUD(`Do Not Disturb is off`);
  }
}

export async function getDNDStatus() {
  const { stdout } = await executeCommand(`echo "status" | shortcuts run "${DNDshortcutName}" | cat`);
  return stdout !== "";
}

export async function checkAndInstallDNDShortcuts(): Promise<boolean> {
  const { stdout } = await executeCommand("shortcuts list");
  const shortcuts = stdout.split("\n").map((item) => item.trim());
  const isInstalled = shortcuts.includes(DNDshortcutName);
  if (!isInstalled) {
    await showHUD("Installing Shortcut (this will only happen once)");
    const shortcutPath = `${__dirname}/assets/${DNDshortcutName}.shortcut`;
    await open(shortcutPath);
    return false;
  }
  return true;
}
