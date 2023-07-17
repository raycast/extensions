import { LocalStorage, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";

export async function checkTerminalSetup(callback: (isTerminalSetup: boolean) => void): Promise<boolean> {
  const localTerminalAppName = await LocalStorage.getItem<string>("terminalAppName");

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Checking terminal App setup",
  });

  if (!localTerminalAppName) {
    toast.style = Toast.Style.Failure;
    toast.title = "No default terminal setup for tmux sessioner";
    callback(false);

    return false;
  } else {
    toast.hide();
    callback(true);

    return true;
  }
}

export async function openTerminal() {
  const localTerminalAppName = await LocalStorage.getItem<string>("terminalAppName");
  execSync(`open -a ${localTerminalAppName}`);
}
