import { getPreferenceValues, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { exec, execSync } from "node:child_process";

type Preferences = {
  preventDisplay: boolean;
  preventDisk: boolean;
  preventSystem: boolean;
  icon: string;
};

type Updates = {
  menubar: boolean;
  status: boolean;
};

export async function startCaffeinate(updates: Updates, hudMessage?: string, additionalArgs?: string) {
  await stopCaffeinate({ menubar: false, status: false });
  exec(`/usr/bin/caffeinate ${generateArgs(additionalArgs)} || true`);
  await update(updates, true);
  if (hudMessage) {
    await showHUD(hudMessage);
  }
}

export async function stopCaffeinate(updates: Updates, hudMessage?: string) {
  execSync("/usr/bin/killall caffeinate || true");
  await update(updates, false);
  if (hudMessage) {
    await showHUD(hudMessage);
  }
}

async function update(updates: Updates, caffeinated: boolean) {
  if (updates.menubar) {
    await tryLaunchCommand("index", { caffeinated });
  }
  if (updates.status) {
    await tryLaunchCommand("status", { caffeinated });
  }
}

async function tryLaunchCommand(commandName: string, context: { caffeinated: boolean }) {
  try {
    await launchCommand({ name: commandName, type: LaunchType.Background, context });
  } catch (error) {
    // Handle error if command is not enabled
  }
}

function generateArgs(additionalArgs?: string) {
  const preferences = getPreferenceValues<Preferences>();
  const args = [];

  if (preferences.preventDisplay) args.push("d");
  if (preferences.preventDisk) args.push("m");
  if (preferences.preventSystem) args.push("i");
  if (additionalArgs) args.push(` ${additionalArgs}`);

  return args.length > 0 ? `-${args.join("")}` : "";
}
