import { getPreferenceValues, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { execSync } from "node:child_process";

function generateArgs(additionalArgs?: string) {
  const preferences = getPreferenceValues<Preferences>();
  const args = [];

  if (preferences.preventDisplay) args.push("d");
  if (preferences.preventDisk) args.push("m");
  if (preferences.preventSystem) args.push("i");
  if (additionalArgs) args.push(` ${additionalArgs}`);

  return args.length > 0 ? `-${args.join("")}` : "";
}

type Updates = {
  menubar: boolean;
  status: boolean;
};

async function update(updates: Updates, caffeinated: boolean) {
  if (updates.menubar) {
    try {
      await launchCommand({ name: "index", type: LaunchType.Background, context: { caffeinated } });
    } catch (error) {
      // catch error if menubar is not enabled
    }
  }
  if (updates.status) {
    await launchCommand({ name: "status", type: LaunchType.Background, context: { caffeinated } });
  }
}

export async function stopCaffeinate(updates: Updates, hudMessage?: string) {
  update(updates, false);

  if (hudMessage) {
    await showHUD(hudMessage);
  }

  execSync("/usr/bin/killall caffeinate || true");
}

export async function startCaffeinate(updates: Updates, hudMessage?: string, additionalArgs?: string) {
  await stopCaffeinate({ menubar: false, status: false });
  update(updates, true);

  if (hudMessage) {
    await showHUD(hudMessage);
  }

  execSync(`/usr/bin/caffeinate ${generateArgs(additionalArgs)} || true`);
}
