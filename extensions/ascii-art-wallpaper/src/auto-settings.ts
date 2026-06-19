import { LocalStorage } from "@raycast/api";

export interface AutoWallpaperSettings {
  colorMode: string;
  backgroundColor: string;
  textColor: string;
  density: string;
}

export const STORAGE_KEY = "auto-wallpaper-settings";

export const DEFAULTS: AutoWallpaperSettings = {
  colorMode: "mono",
  backgroundColor: "#000000",
  textColor: "#ffffff",
  density: "200",
};

export async function getAutoSettings(): Promise<AutoWallpaperSettings> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return DEFAULTS;
  try {
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export async function setAutoSettings(settings: AutoWallpaperSettings): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
