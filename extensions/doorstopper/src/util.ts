import { launchCommand, LaunchType, showHUD } from "@raycast/api";
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
    console.error(`Error launching command ${commandName}:`, error);
  }
}

export function isDoorstopperEnabled(): boolean {
  try {
    const out = execSync("pmset -g | awk '/SleepDisabled.*?([0-9])/{print $2}'");
    return out.toString().trim() === "1";
  } catch {
    return false;
  }
}

export async function startDoorstopper(updates: Updates, hudMessage?: string) {
  const shellCommand = "pmset -a disablesleep 1";
  execSync(
    `osascript -e 'do shell script "${shellCommand}" with prompt "Doorstopper requires admin privileges" with administrator privileges'`,
  );
  await update(updates, true);
  if (hudMessage) {
    await showHUD(hudMessage);
  }
}

export async function stopDoorstopper(updates: Updates, hudMessage?: string) {
  const shellCommand = "pmset -a disablesleep 0";
  execSync(
    `osascript -e 'do shell script "${shellCommand}" with prompt "Doorstopper requires admin privileges" with administrator privileges'`,
  );
  await update(updates, false);
  if (hudMessage) {
    await showHUD(hudMessage);
  }
}
