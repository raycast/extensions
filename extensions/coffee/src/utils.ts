import { getPreferenceValues, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { exec } from "node:child_process";

function generateArgs(additionalArgs?: string) {
  const preferences = getPreferenceValues<Preferences>();
  const args = [];

  if (preferences.preventDisplay) {
    args.push("d");
  }

  if (preferences.preventDisk) {
    args.push("m");
  }

  if (preferences.preventSystem) {
    args.push("i");
  }

  if (additionalArgs) {
    args.push(` ${args}`);
  }

  if (args.length > 0) {
    return `-${args.join("")}`;
  }

  return "";
}

export async function stopCaffeinate(updateMenubar = true, hudMessage?: string) {
  try {
    if (updateMenubar) {
      await launchCommand({ name: "index", type: LaunchType.Background, context: { caffeinated: false } });
    }
    await launchCommand({ name: "status", type: LaunchType.Background, context: { caffeinated: false } });
  } catch (error) {
    console.error(error);
  }

  if (hudMessage) {
    await showHUD(hudMessage);
  }

  exec("/usr/bin/killall caffeinate");
}

export async function startCaffeinate(updateMenubar = true, hudMessage?: string, additionalArgs?: string) {
  await stopCaffeinate(false);
  try {
    if (updateMenubar) {
      // will error if menubar is not enabled
      try {
        await launchCommand({ name: "index", type: LaunchType.Background, context: { caffeinated: true } });
      } catch (e) {
        console.log("Menubar command is not enabled");
      }
    }
    await launchCommand({ name: "status", type: LaunchType.Background, context: { caffeinated: true } });
  } catch (error) {
    console.error(error);
  }

  if (hudMessage) {
    await showHUD(hudMessage);
  }

  exec(`/usr/bin/caffeinate ${generateArgs(additionalArgs)}`);
}
