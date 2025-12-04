import { LocalStorage } from "@raycast/api";

const getEnabledBrightnessPresetsAsJson = async (): Promise<string> => {
  const enabledBrightnessPresetsAsJson = await LocalStorage.getItem<string>("enabledBrightnessPresets");

  if (typeof enabledBrightnessPresetsAsJson === "string") {
    return enabledBrightnessPresetsAsJson;
  } else {
    return "[]";
  }
};

export const getEnabledBrightnessPresets = async (): Promise<Set<number>> => {
  const enabledBrightnessPresetsAsJson = await getEnabledBrightnessPresetsAsJson();
  return new Set(JSON.parse(enabledBrightnessPresetsAsJson));
};

const setEnabledBrightnessPresets = async (enabledBrightnessPresets: Set<number>): Promise<void> => {
  await LocalStorage.setItem("enabledBrightnessPresets", JSON.stringify(Array.from(enabledBrightnessPresets)));
};

export const enableBrightnessPreset = async (brightnessPreset: number): Promise<void> => {
  const enabledBrightnessPresets = await getEnabledBrightnessPresets();
  setEnabledBrightnessPresets(enabledBrightnessPresets.add(brightnessPreset));
};

export const disableBrightnessPreset = async (brightnessPreset: number): Promise<void> => {
  const enabledBrightnessPresets = await getEnabledBrightnessPresets();
  enabledBrightnessPresets.delete(brightnessPreset);
  setEnabledBrightnessPresets(enabledBrightnessPresets);
};

export const SUPPORTED_BRIGHTNESS_PRESETS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
