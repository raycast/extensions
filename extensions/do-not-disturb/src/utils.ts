import { exec } from "child_process";
import { open, showHUD, closeMainWindow } from "@raycast/api";
import { LaunchOptions, callbackLaunchCommand } from "raycast-cross-extension";

export type LaunchContext = {
  suppressHUD?: boolean;
  callbackLaunchOptions?: LaunchOptions;
};

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

export async function getDNDStatus() {
  const { stdout } = await executeCommand(`echo "status" | shortcuts run "${DNDshortcutName}" | cat`);
  return stdout !== "";
}

export async function turnOnDND(suppressHUD?: boolean) {
  const isInstalled = await checkAndInstallDNDShortcuts();
  if (!isInstalled) return;
  await executeCommand(`echo "on" | shortcuts run "${DNDshortcutName}"`);
  const isOn = await getDNDStatus();
  if (isOn && !suppressHUD) {
    await showHUD(`Do Not Disturb is on`);
  }
}

export async function turnOffDND(suppressHUD?: boolean) {
  const isInstalled = await checkAndInstallDNDShortcuts();
  if (!isInstalled) return;
  await executeCommand(`echo "off" | shortcuts run "${DNDshortcutName}"`);
  const isOn = await getDNDStatus();
  if (!isOn && !suppressHUD) {
    await showHUD(`Do Not Disturb is off`);
  }
}

export async function statusDND(suppressHUD?: boolean) {
  const isInstalled = await checkAndInstallDNDShortcuts();
  if (!isInstalled) return;
  const isOn = await getDNDStatus();
  if (!suppressHUD) {
    await showHUD(`Do Not Disturb is ${isOn ? "on" : "off"}`);
  }
  return isOn;
}

export async function toggleDND(suppressHUD?: boolean) {
  const isInstalled = await checkAndInstallDNDShortcuts();
  if (!isInstalled) return;
  const isOn = await getDNDStatus();
  if (isOn) {
    await turnOffDND(suppressHUD);
  } else {
    await turnOnDND(suppressHUD);
  }
  return !isOn;
}

export async function handleCrossLaunch(callbackLaunchOptions?: LaunchOptions, payload?: LaunchOptions["context"]) {
  if (callbackLaunchOptions) {
    await callbackLaunchCommand(callbackLaunchOptions, payload);
  }
}
