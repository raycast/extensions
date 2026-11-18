import { mkdirSync, readFileSync, renameSync, writeFileSync } from "fs";
import { dirname } from "path";
import { SETTINGS_PATH } from "./constants";

export interface HandySettings {
  custom_words: string[];
  selected_model: string;
  selected_language: string;
  [key: string]: unknown;
}

interface SettingsStore {
  settings: HandySettings;
  [key: string]: unknown;
}

function readStore(filePath: string): Partial<SettingsStore> {
  let raw: string;
  try {
    raw = readFileSync(filePath, "utf-8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return {};
    throw err;
  }
  return (JSON.parse(raw) ?? {}) as Partial<SettingsStore>;
}

export function readSettings(filePath: string = SETTINGS_PATH): HandySettings {
  const store = readStore(filePath);
  const settings = store.settings ?? ({} as HandySettings);
  return {
    ...settings,
    selected_model: settings.selected_model ?? "",
    selected_language: settings.selected_language ?? "auto",
  };
}

export function writeSettings(
  update: Partial<HandySettings>,
  filePath: string = SETTINGS_PATH,
): void {
  const store = readStore(filePath);
  store.settings = { ...(store.settings ?? {}), ...update } as HandySettings;
  const tmp = filePath + ".raycast-tmp";
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(tmp, JSON.stringify(store), "utf-8");
  renameSync(tmp, filePath);
}
