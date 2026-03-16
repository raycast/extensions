import { readFileSync, renameSync, writeFileSync } from "fs";
import { SETTINGS_PATH } from "./constants";

export interface HandySettings {
  custom_words: string[];
  selected_model: string;
  [key: string]: unknown;
}

interface SettingsStore {
  settings: HandySettings;
}

export function readSettings(filePath: string = SETTINGS_PATH): HandySettings {
  const raw = readFileSync(filePath, "utf-8");
  const store = JSON.parse(raw) as SettingsStore;
  return store.settings;
}

export function writeSettings(
  update: Partial<HandySettings>,
  filePath: string = SETTINGS_PATH,
): void {
  const raw = readFileSync(filePath, "utf-8");
  const store = JSON.parse(raw) as SettingsStore;
  store.settings = { ...store.settings, ...update };
  // Write to a sibling temp file then rename — rename(2) is atomic on macOS/Linux,
  // preventing corruption of Handy's tauri-plugin-store on mid-write interruption.
  // tauri-plugin-store writes compact JSON; we match that format to avoid noisy diffs.
  const tmp = filePath + ".raycast-tmp";
  writeFileSync(tmp, JSON.stringify(store), "utf-8");
  renameSync(tmp, filePath);
}
