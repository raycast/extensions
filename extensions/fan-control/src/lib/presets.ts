import { LocalStorage } from "@raycast/api";
import type { CustomPreset } from "../types";

const STORAGE_KEY = "custom-fan-presets";

function isCustomPreset(value: unknown): value is CustomPreset {
  if (!value || typeof value !== "object") return false;

  const preset = value as Partial<CustomPreset>;
  return (
    typeof preset.id === "string" &&
    typeof preset.name === "string" &&
    typeof preset.rpm === "number" &&
    Number.isInteger(preset.rpm)
  );
}

export async function readPresets(): Promise<CustomPreset[]> {
  const stored = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!stored) return [];

  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed.filter(isCustomPreset) : [];
  } catch {
    return [];
  }
}

export async function upsertPreset(
  preset: CustomPreset,
): Promise<CustomPreset[]> {
  const presets = await readPresets();
  const exists = presets.some((item) => item.id === preset.id);
  const nextPresets = exists
    ? presets.map((item) => (item.id === preset.id ? preset : item))
    : [...presets, preset];

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(nextPresets));
  return nextPresets;
}

export async function removePreset(presetId: string): Promise<CustomPreset[]> {
  const presets = await readPresets();
  const nextPresets = presets.filter((item) => item.id !== presetId);

  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(nextPresets));
  return nextPresets;
}
