import { LocalStorage } from "@raycast/api";

export type TargetMode = "all" | "selected";

export type TargetConfig = {
  mode: TargetMode;
  selectedLights: string[];
};

const TARGET_CONFIG_STORAGE_KEY = "key-light-target-config";

const DEFAULT_TARGET_CONFIG: TargetConfig = {
  mode: "all",
  selectedLights: [],
};

export async function getTargetConfig(): Promise<TargetConfig> {
  const data = await LocalStorage.getItem<string>(TARGET_CONFIG_STORAGE_KEY);
  if (!data) {
    return DEFAULT_TARGET_CONFIG;
  }

  try {
    const parsed = JSON.parse(data) as Partial<TargetConfig>;
    return {
      mode: parsed.mode === "selected" ? "selected" : "all",
      selectedLights: Array.isArray(parsed.selectedLights) ? parsed.selectedLights.filter(Boolean) : [],
    };
  } catch {
    return DEFAULT_TARGET_CONFIG;
  }
}

export async function saveTargetConfig(config: TargetConfig) {
  await LocalStorage.setItem(TARGET_CONFIG_STORAGE_KEY, JSON.stringify(config));
}
