import { LocalStorage } from "@raycast/api";

export const PRESETS_KEY = "ideate-presets";

export interface InitPreset {
  name: string;
  path: string[];
  ideBundleId: string;
  command: string;
}

export async function getPresets(): Promise<InitPreset[]> {
  const data = await LocalStorage.getItem<string>(PRESETS_KEY);
  if (!data) {
    return [];
  }

  try {
    return JSON.parse(data as string);
  } catch (error) {
    console.error("Failed to parse presets:", error);
    return [];
  }
}

export async function savePreset(preset: InitPreset): Promise<void> {
  const presets = await getPresets();
  const existingIndex = presets.findIndex((p) => p.name === preset.name);

  if (existingIndex >= 0) {
    presets[existingIndex] = preset;
  } else {
    presets.push(preset);
  }

  await LocalStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
}

export async function deletePreset(name: string): Promise<void> {
  const presets = await getPresets();
  const filteredPresets = presets.filter((p) => p.name !== name);
  await LocalStorage.setItem(PRESETS_KEY, JSON.stringify(filteredPresets));
}
