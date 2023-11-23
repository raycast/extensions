import { getPreferenceValues, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { exec } from "node:child_process";

function preventArguments(args?: string | undefined) {
  const preferences = getPreferenceValues<Preferences>();
  const preventArguments = [];

  if (preferences.preventDisplay) {
    preventArguments.push("d");
  }

  if (preferences.preventDisk) {
    preventArguments.push("m");
  }

  if (preferences.preventSystem) {
    preventArguments.push("i");
  }

  if (typeof args === "string") {
    preventArguments.push(` ${args}`);
  }

  if (preventArguments.length > 0) {
    return `-${preventArguments.join("")}`;
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

  return exec("/usr/bin/killall caffeinate");
}

export async function startCaffeinate(updateMenubar = true, hudMessage?: string, args?: string | undefined) {
  await stopCaffeinate(false);
  try {
    if (updateMenubar) {
      await launchCommand({ name: "index", type: LaunchType.Background, context: { caffeinated: true } });
    }
    await launchCommand({ name: "status", type: LaunchType.Background, context: { caffeinated: true } });
  } catch (error) {
    console.error(error);
  }

  if (hudMessage) {
    await showHUD(hudMessage);
  }

  return exec(`/usr/bin/caffeinate ${preventArguments(args)}`);
}
