import { LocalStorage } from "@raycast/api";
import { useLocalStorage } from "@raycast/utils";

export type Preset = {
  /**
   * The ID of the preset.
   */
  id: string;
  /**
   * An emoji as the preset icon.
   */
  icon?: string;
  /**
   * The name of the preset.
   */
  name: string;
  /**
   * The settings of the preset.
   */
  settings: {
    /**
     * The brightness (percentage) of the key light.
     * @default 20
     * @min 0
     * @max 100
     */
    brightness?: number;
    /**
     * The temperature (percentage) of the key light.
     * @default 20
     * @min 0 (cold, ~2000K)
     * @max 100 (warm, ~7000K)
     */
    temperature?: number;
  };
};

const PRESETS_STORAGE_KEY = "key-light-presets";

const DEFAULT_PRESETS: Preset[] = [
  {
    id: "default",
    name: "Default",
    settings: { brightness: 20, temperature: 50 },
  },
  {
    id: "night",
    name: "Night",
    settings: { brightness: 10, temperature: 10 },
    icon: "🌙",
  },
  {
    id: "day",
    name: "Day",
    settings: { brightness: 80, temperature: 60 },
    icon: "☀️",
  },
  {
    id: "warm",
    name: "Warm",
    settings: { brightness: 50, temperature: 80 },
    icon: "🔥",
  },
  {
    id: "cold",
    name: "Cold",
    settings: { brightness: 50, temperature: 20 },
    icon: "❄️",
  },
];

export async function getPresets() {
  const data = await LocalStorage.getItem<string>(PRESETS_STORAGE_KEY);
  return data ? (JSON.parse(data) as Preset[]) : DEFAULT_PRESETS;
}

export async function savePreset(preset: Preset) {
  const presets = await getPresets();
  const existingIndex = presets.findIndex((p) => p.name === preset.name);

  if (existingIndex >= 0) {
    presets[existingIndex] = preset;
  } else {
    presets.push(preset);
  }

  await LocalStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

export async function deletePreset(id: string) {
  const presets = await getPresets();
  const filteredPresets = presets.filter((p) => p.id !== id);
  await LocalStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(filteredPresets));
}

export async function getPreset(id: string) {
  const presets = await getPresets();
  return presets.find((p) => p.id === id);
}

export function usePresets() {
  return useLocalStorage<Preset[]>(PRESETS_STORAGE_KEY, DEFAULT_PRESETS);
}
