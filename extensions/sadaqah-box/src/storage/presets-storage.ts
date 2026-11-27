/**
 * Presets Storage with runtime validation and normalized ordering
 */

import { LocalStorage } from "@raycast/api";
import { Preset } from "../types";
import { STORAGE_KEYS } from "../constants";
import { generateSecureId } from "../utils/security";
import { isPreset } from "../utils/type-guards";

function normalizeOrder(presets: Preset[]): Preset[] {
  return presets.map((preset, index) => ({
    ...preset,
    order: index + 1,
  }));
}

/**
 * Get all presets from LocalStorage, validated and sorted by order
 */
export async function getPresets(): Promise<Preset[]> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.PRESETS);
    if (!stored) {
      return [];
    }
    const parsed: unknown = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [];
    }
    const validPresets = parsed.filter(isPreset);
    return validPresets.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
  } catch {
    return [];
  }
}

/**
 * Save presets to LocalStorage
 */
export async function savePresets(presets: Preset[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEYS.PRESETS, JSON.stringify(presets));
}

/**
 * Add a new preset
 */
export async function addPreset(name: string, value: number, currencyId: string, amount?: number): Promise<Preset> {
  const presets = await getPresets();
  const maxOrder = presets.length > 0 ? Math.max(...presets.map((p) => p.order ?? 0)) : 0;

  const newPreset: Preset = {
    id: generateSecureId(),
    name,
    value,
    currencyId,
    amount,
    createdAt: new Date().toISOString(),
    order: maxOrder + 1,
  };

  presets.push(newPreset);
  await savePresets(presets);

  return newPreset;
}

/**
 * Delete a preset by ID
 */
export async function deletePreset(presetId: string): Promise<boolean> {
  const presets = await getPresets();
  const filtered = presets.filter((p) => p.id !== presetId);

  if (filtered.length === presets.length) {
    return false;
  }

  await savePresets(normalizeOrder(filtered));
  return true;
}

/**
 * Update an existing preset
 */
export async function updatePreset(
  presetId: string,
  updates: Partial<Omit<Preset, "id" | "createdAt">>,
): Promise<Preset | null> {
  const presets = await getPresets();
  const index = presets.findIndex((p) => p.id === presetId);

  if (index === -1) {
    return null;
  }

  presets[index] = { ...presets[index], ...updates };
  await savePresets(presets);

  return presets[index];
}

/**
 * Set a preset as the default preset, unsetting any previous default
 */
export async function setDefaultPreset(presetId: string): Promise<boolean> {
  const presets = await getPresets();
  const updatedPresets = presets.map((p) => ({
    ...p,
    isDefault: p.id === presetId,
  }));

  await savePresets(updatedPresets);
  return true;
}

/**
 * Unset the default preset
 */
export async function unsetDefaultPreset(): Promise<boolean> {
  const presets = await getPresets();
  const updatedPresets = presets.map((p) => ({
    ...p,
    isDefault: false,
  }));

  await savePresets(updatedPresets);
  return true;
}

/**
 * Get the default preset
 */
export async function getDefaultPreset(): Promise<Preset | null> {
  const presets = await getPresets();
  return presets.find((p) => p.isDefault) || null;
}

async function movePreset(presetId: string, direction: -1 | 1): Promise<boolean> {
  const presets = normalizeOrder(await getPresets());
  const index = presets.findIndex((p) => p.id === presetId);
  const targetIndex = index + direction;

  if (index === -1 || targetIndex < 0 || targetIndex >= presets.length) {
    return false;
  }

  const currentOrder = presets[index].order;
  presets[index].order = presets[targetIndex].order;
  presets[targetIndex].order = currentOrder;

  await savePresets(presets);
  return true;
}

/**
 * Move a preset up in the order
 */
export async function movePresetUp(presetId: string): Promise<boolean> {
  return movePreset(presetId, -1);
}

/**
 * Move a preset down in the order
 */
export async function movePresetDown(presetId: string): Promise<boolean> {
  return movePreset(presetId, 1);
}
