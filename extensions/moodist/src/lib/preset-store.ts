import { LocalStorage } from "@raycast/api";
import { randomUUID } from "crypto";
import { STORAGE_KEYS } from "./constants";
import type { ActiveSound, Preset } from "../types";

export async function getAllPresets(): Promise<Preset[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEYS.PRESETS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as Preset[];
  } catch {
    return [];
  }
}

async function saveAllPresets(presets: Preset[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
}

export async function savePreset(name: string, sounds: ActiveSound[], masterVolume: number): Promise<Preset> {
  const preset: Preset = {
    id: randomUUID(),
    name,
    sounds: [...sounds],
    masterVolume,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const all = await getAllPresets();
  all.push(preset);
  await saveAllPresets(all);
  return preset;
}

export async function deletePreset(id: string): Promise<void> {
  const all = await getAllPresets();
  await saveAllPresets(all.filter((p) => p.id !== id));
}

export async function renamePreset(id: string, newName: string): Promise<void> {
  const all = await getAllPresets();
  const preset = all.find((p) => p.id === id);
  if (preset) {
    preset.name = newName;
    preset.updatedAt = Date.now();
    await saveAllPresets(all);
  }
}

export async function updatePresetSounds(id: string, sounds: ActiveSound[], masterVolume: number): Promise<void> {
  const all = await getAllPresets();
  const preset = all.find((p) => p.id === id);
  if (preset) {
    preset.sounds = [...sounds];
    preset.masterVolume = masterVolume;
    preset.updatedAt = Date.now();
    await saveAllPresets(all);
  }
}
