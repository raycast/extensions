import { closeMainWindow, getPreferenceValues, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { getDeviceUrl } from "./discover";
import { setVolume } from "../api/player";
import { cache } from "./cache";
import { createLog } from "./debug";

const log = createLog("setPresetVolume");

export enum Preset {
  Minimal = "minimal",
  Normal = "normal",
  High = "high",
}

export async function setPresetVolume(preset: Preset): Promise<void> {
  try {
    closeMainWindow();

    const preferences = getPreferenceValues<Preferences>();
    const rawValue = preferences[`${preset}Volume` as keyof Preferences];
    const volume = parseInt(rawValue, 10);
    const label = preset.charAt(0).toUpperCase() + preset.slice(1);

    if (isNaN(volume)) {
      throw new Error(`${label} volume expected to be a number. "${rawValue}" was set. Please check your preferences.`);
    }

    if (volume <= 0) {
      throw new Error(
        `${label} volume expected to be greater than 0. "${volume}" was set. Please check your preferences.`,
      );
    }

    if (volume > 100) {
      throw new Error(
        `${label} volume expected to be less than 100. "${volume}" was set. Please check your preferences.`,
      );
    }

    const playerUrl = await getDeviceUrl();

    await setVolume(playerUrl, volume);

    log.log(`Volume set to ${volume}`);
    showHUD(`${cache.deviceName} volume was set to ${volume}`);
  } catch (error) {
    log.error(`Failed to set ${preset} volume: ${(<Error>error).message}`);
    await showFailureToast(error, { title: `Failed to set ${preset} volume` });
  }
}
