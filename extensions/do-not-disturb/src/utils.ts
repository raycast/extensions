import { exec } from "child_process";
import { open, showHUD, closeMainWindow } from "@raycast/api";

const DNDshortcutName = `DND Raycast`;

function executeCommand(command: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
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
    await closeMainWindow();
    await showHUD("Installing Shortcut (this will only happen once)");
    const shortcutPath = `${__dirname}/assets/${DNDshortcutName}.shortcut`;
    await open(shortcutPath);
    return false;
  }
  return true;
}

export async function turnOnDND() {
  const isInstalled = await checkAndInstallDNDShortcuts();
  if (!isInstalled) return;
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

export async function statusDND() {
  const isInstalled = await checkAndInstallDNDShortcuts();
  if (!isInstalled) return;
  const isOn = await getDNDStatus();
  await showHUD(`Do Not Disturb is ${isOn ? "on" : "off"}`);
}

export async function toggleDND() {
  const isInstalled = await checkAndInstallDNDShortcuts();
  if (!isInstalled) return;
  const isOn = await getDNDStatus();
  if (isOn) {
    await turnOffDND();
  } else {
    await turnOnDND();
  }
}

export async function getDNDStatus() {
  const { stdout } = await executeCommand(`echo "status" | shortcuts run "${DNDshortcutName}" | cat`);
  return stdout !== "";
}
