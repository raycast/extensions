import { launchCommand, LaunchType, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execSync } from "node:child_process";

type Updates = {
  menubar?: boolean;
  status: boolean;
};

async function update(updates: Updates, enabled: boolean) {
  if (updates.menubar) {
    await tryLaunchCommand("statusmenu", { enabled });
  }
  if (updates.status) {
    await tryLaunchCommand("status", { enabled });
  }
}

async function tryLaunchCommand(commandName: string, context: { enabled: boolean }) {
  try {
    await launchCommand({ name: commandName, type: LaunchType.Background, context });
  } catch (error) {
    await showFailureToast(`Failed to launch command ${commandName}`, { message: String(error) });
  }
}

async function execCommand(shellCommand: string, updates: Updates, hudMessage?: string) {
  try {
    execSync(
      `osascript -e 'do shell script "${shellCommand}" with prompt "Doorstopper requires admin privileges" with administrator privileges'`,
    );
    await update(updates, false);
    if (hudMessage) {
      await showHUD(hudMessage);
    }
  } catch (error) {
    showFailureToast(`Failed to execute command ${shellCommand}`, { message: String(error) });
  }
}

export function isDoorstopperEnabled(): boolean {
  try {
    return execSync("pmset -g | awk '/SleepDisabled.*?([0-9])/{print $2}'").toString().trim() === "1";
  } catch (error) {
    console.log(`Failed to get status`, error);
    return false;
  }
}

export async function startDoorstopper(updates: Updates, hudMessage?: string) {
  await execCommand("pmset -a disablesleep 1", updates, hudMessage);
}

export async function stopDoorstopper(updates: Updates, hudMessage?: string) {
  await execCommand("pmset -a disablesleep 0", updates, hudMessage);
}
