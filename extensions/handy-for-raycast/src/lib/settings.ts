import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SETTINGS_PATH } from "./paths";

export interface HandySettings {
  custom_words?: string[];
  selected_model?: string;
  selected_language?: string;
  post_process_enabled?: boolean;
  post_process_provider_id?: string;
  post_process_selected_prompt_id?: string | null;
  [key: string]: unknown;
}

interface SettingsStore {
  settings: HandySettings;
  [key: string]: unknown;
}

function parseStore(filePath: string): SettingsStore {
  if (!existsSync(filePath))
    throw new Error("Handy settings were not found. Install and open Handy once, then try again.");
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as Partial<SettingsStore>;
  if (!parsed.settings || typeof parsed.settings !== "object")
    throw new Error("Handy's settings file has an unsupported format.");
  return parsed as SettingsStore;
}

export function readSettings(filePath = SETTINGS_PATH): HandySettings {
  return parseStore(filePath).settings;
}

export function updateSettings(update: Partial<HandySettings>, filePath = SETTINGS_PATH): HandySettings {
  const store = parseStore(filePath);
  const settings = { ...store.settings, ...update };
  const temp = join(dirname(filePath), `.settings_store.raycast-${randomUUID()}.tmp`);
  try {
    writeFileSync(temp, JSON.stringify({ ...store, settings }), { encoding: "utf8", mode: 0o600 });
    renameSync(temp, filePath);
  } catch (error) {
    if (existsSync(temp)) unlinkSync(temp);
    throw error;
  }
  return settings;
}
