import { launchCommand, LaunchType, showHUD, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execSync } from "node:child_process";
import { AuthenticationCanceledError, runWithPrivileges } from "./sudoSupport";

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
    await showFailureToast(error, { title: `Failed to launch command ${commandName}` });
  }
}

async function execCommand(shellCommand: string, updates: Updates, hudMessage?: string) {
  try {
    await runWithPrivileges(shellCommand);
    await update(updates, false);
    if (hudMessage) {
      await showHUD(hudMessage);
    }
  } catch (error) {
    if (error instanceof AuthenticationCanceledError) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Authentication canceled",
        message: error.message,
      });
      return;
    }

    await showFailureToast(error, { title: "Failed to update Doorstopper" });
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
  await execCommand("/usr/bin/pmset -a disablesleep 1", updates, hudMessage);
}

export async function stopDoorstopper(updates: Updates, hudMessage?: string) {
  await execCommand("/usr/bin/pmset -a disablesleep 0", updates, hudMessage);
}
