import { getPreferenceValues, launchCommand, LaunchType, showHUD } from "@raycast/api";
import { caffeinatePreferences } from "./interfaces";
import { exec } from "child_process";

function preventArguments(args?: string | undefined) {
  const preferences = getPreferenceValues<caffeinatePreferences>();
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
  if (updateMenubar) {
    await launchCommand({ name: "index", type: LaunchType.Background, context: { caffinated: false } });
  }

  if (hudMessage) {
    await showHUD(hudMessage);
  }

  return exec("/usr/bin/killall caffeinate");
}

export async function startCaffeinate(updateMenubar = true, hudMessage?: string, args?: string | undefined) {
  await stopCaffeinate(false);
  if (updateMenubar) {
    await launchCommand({ name: "index", type: LaunchType.Background, context: { caffinated: true } });
  }

  if (hudMessage) {
    await showHUD(hudMessage);
  }

  return exec(`/usr/bin/caffeinate ${preventArguments(args)}`);
}
