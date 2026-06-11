import { readFileSync, renameSync, writeFileSync } from "fs";
import { SETTINGS_PATH } from "./constants";

export interface HandySettings {
  custom_words: string[];
  selected_model: string;
  selected_language: string;
  [key: string]: unknown;
}

interface SettingsStore {
  settings: HandySettings;
}

export function readSettings(filePath: string = SETTINGS_PATH): HandySettings {
  const raw = readFileSync(filePath, "utf-8");
  const store = JSON.parse(raw) as SettingsStore;
  return {
    ...store.settings,
    selected_language: store.settings.selected_language ?? "auto",
  };
}

export function writeSettings(
  update: Partial<HandySettings>,
  filePath: string = SETTINGS_PATH,
): void {
  const raw = readFileSync(filePath, "utf-8");
  const store = JSON.parse(raw) as SettingsStore;
  store.settings = { ...store.settings, ...update };
  const tmp = filePath + ".raycast-tmp";
  writeFileSync(tmp, JSON.stringify(store), "utf-8");
  renameSync(tmp, filePath);
}
