import { LocalStorage } from "@raycast/api";

const getEnabledTemperaturePresetsAsJson = async (): Promise<string> => {
  const enabledTemperaturePresetsAsJson = await LocalStorage.getItem<string>("enabledTemperaturePresets");

  if (typeof enabledTemperaturePresetsAsJson === "string") {
    return enabledTemperaturePresetsAsJson;
  } else {
    return "[]";
  }
};

export const getEnabledTemperaturePresets = async (): Promise<Set<number>> => {
  const enabledTemperaturePresetsAsJson = await getEnabledTemperaturePresetsAsJson();
  return new Set(JSON.parse(enabledTemperaturePresetsAsJson));
};

const setEnabledTemperaturePresets = async (enabledTemperaturePresets: Set<number>): Promise<void> => {
  await LocalStorage.setItem("enabledTemperaturePresets", JSON.stringify(Array.from(enabledTemperaturePresets)));
};

export const enableTemperaturePreset = async (temperaturePreset: number): Promise<void> => {
  const enabledTemperaturePresets = await getEnabledTemperaturePresets();
  setEnabledTemperaturePresets(enabledTemperaturePresets.add(temperaturePreset));
};

export const disableTemperaturePreset = async (temperaturePreset: number): Promise<void> => {
  const enabledTemperaturePresets = await getEnabledTemperaturePresets();
  enabledTemperaturePresets.delete(temperaturePreset);
  setEnabledTemperaturePresets(enabledTemperaturePresets);
};

export const SUPPORTED_TEMPERATURE_PRESETS = [
  2700, 2800, 2900, 3000, 3100, 3200, 3300, 3400, 3500, 3600, 3700, 3800, 3900, 4000, 4100, 4200, 4300, 4400, 4500,
  4600, 4700, 4800, 4900, 5000, 5100, 5200, 5300, 5400, 5500, 5600, 5700, 5800, 5900, 6000, 6100, 6200, 6300, 6400,
  6500,
];
