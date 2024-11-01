import { exec } from "child_process";
import { open, showHUD } from "@raycast/api";
import { preferences } from "./intervals";

const DNDshortcutName = `DND Raycast`;

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

async function checkAndInstallDNDShortcuts(): Promise<boolean> {
  const { stdout } = await executeCommand("shortcuts list");
  const shortcuts = stdout.split("\n").map((item) => item.trim());
  const isInstalled = shortcuts.includes(DNDshortcutName);
  if (!isInstalled) {
    const shortcutPath = `${__dirname}/assets/${DNDshortcutName}.shortcut`;
    await open(shortcutPath);
    return false;
  }
  return true;
}

export async function turnOnDND() {
  const isInstalled = await checkAndInstallDNDShortcuts();
  if (!isInstalled) {
    return;
  }
  await executeCommand(`echo "on" | shortcuts run "${DNDshortcutName}"`);
  const isOn = await getDNDStatus();
  if (isOn) {
    await showHUD(`Do Not Disturb is on`);
  }
}

export async function turnOffDND() {
  const isInstalled = await checkAndInstallDNDShortcuts();
  if (!isInstalled) return;
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
