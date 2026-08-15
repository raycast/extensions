/**
 * Presets Storage with secure ID generation
 */

import { LocalStorage } from "@raycast/api";
import { Preset } from "./types";
import { STORAGE_KEYS } from "./constants";
import { generateSecureId } from "./utils/security";

/**
 * Get all presets from LocalStorage, sorted by order
 */
export async function getPresets(): Promise<Preset[]> {
  try {
    const stored = await LocalStorage.getItem<string>(STORAGE_KEYS.PRESETS);
    if (!stored) {
      return [];
    }
    const parsed = JSON.parse(stored);
    const presets = Array.isArray(parsed) ? parsed : [];
    // Sort by order field if available, otherwise keep original order
    return presets.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
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

  // Reorder remaining presets
  const reordered = filtered.map((p, index) => ({ ...p, order: index + 1 }));
  await savePresets(reordered);
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
 * Set a preset as the default preset
 * This will unset any existing default and set the new one
 */
export async function setDefaultPreset(presetId: string): Promise<boolean> {
  const presets = await getPresets();

  // Unset any existing default
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

/**
 * Move a preset up in the order
 */
export async function movePresetUp(presetId: string): Promise<boolean> {
  const presets = await getPresets();
  const index = presets.findIndex((p) => p.id === presetId);

  if (index <= 0) {
    return false;
  }

  // Swap orders
  const temp = presets[index].order;
  presets[index].order = presets[index - 1].order;
  presets[index - 1].order = temp;

  await savePresets(presets);
  return true;
}

/**
 * Move a preset down in the order
 */
export async function movePresetDown(presetId: string): Promise<boolean> {
  const presets = await getPresets();
  const index = presets.findIndex((p) => p.id === presetId);

  if (index === -1 || index >= presets.length - 1) {
    return false;
  }

  // Swap orders
  const temp = presets[index].order;
  presets[index].order = presets[index + 1].order;
  presets[index + 1].order = temp;

  await savePresets(presets);
  return true;
}
