import { LocalStorage } from "@raycast/api";
import { execSync } from "child_process";

export async function checkTerminalSetup(callback: (isTerminalSetup: boolean) => void): Promise<boolean> {
  const localTerminalAppName = await LocalStorage.getItem<string>("terminalAppBundleId");
  const isTerminalSetup = Boolean(localTerminalAppName);
  callback(isTerminalSetup);
  return isTerminalSetup;
}

export async function openTerminal() {
  const localTerminalAppBundleId = await LocalStorage.getItem<string>("terminalAppBundleId");
  execSync(`open -b ${localTerminalAppBundleId}`);
}
