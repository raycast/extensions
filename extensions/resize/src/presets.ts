import { environment } from "@raycast/api";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { homedir } from "os";
import path from "path";
import { Preset, PresetFile } from "./types";

export const USER_PRESET_PATH = path.join(homedir(), ".config", "resize", "presets.json");

export function loadPresets(): { presets: Preset[]; cycle: string[]; fileCycle?: string[] } {
  const bundled: PresetFile = JSON.parse(
    readFileSync(path.join(environment.assetsPath, "devices.json"), "utf8"),
  );

  let user: PresetFile | undefined;
  if (existsSync(USER_PRESET_PATH)) {
    try {
      user = JSON.parse(readFileSync(USER_PRESET_PATH, "utf8"));
    } catch {
      // unreadable user file: fall back to built-ins rather than breaking every command
    }
  }

  const byId = new Map<string, Preset>();
  for (const p of bundled.presets) byId.set(p.id, p);
  for (const p of user?.presets ?? []) byId.set(p.id, { ...byId.get(p.id), ...p });

  return {
    presets: [...byId.values()],
    cycle: user?.cycle ?? bundled.cycle ?? [],
    fileCycle: user?.cycle,
  };
}

export function saveUserPreset(preset: Preset): void {
  let file: PresetFile = { version: 1, presets: [] };
  if (existsSync(USER_PRESET_PATH)) {
    try {
      file = JSON.parse(readFileSync(USER_PRESET_PATH, "utf8"));
    } catch {
      // overwrite a corrupt file rather than crash
    }
  }
  file.presets = [...file.presets.filter((p) => p.id !== preset.id), preset];
  mkdirSync(path.dirname(USER_PRESET_PATH), { recursive: true });
  writeFileSync(USER_PRESET_PATH, JSON.stringify(file, null, 2) + "\n");
}

export function presetDeeplink(preset: Preset): string {
  const args = encodeURIComponent(JSON.stringify({ preset: preset.id }));
  return `raycast://extensions/ali_reza_mohammad_poor/resize/apply-preset?arguments=${args}`;
}
