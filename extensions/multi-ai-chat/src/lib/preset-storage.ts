import {
  DELETED_PRESET_STORAGE_PREFIX,
  deletedPresetStorageKey,
  deserializeLegacyPresets,
  deserializePreset,
  PRESET_STORAGE_PREFIX,
  PRESETS_STORAGE_KEY,
  presetStorageKey,
  type PromptPreset,
} from "./presets.js";

type StoredValue = string | number | boolean;

export interface PresetStorage {
  allItems(): Promise<Record<string, StoredValue>>;
  getItem(key: string): Promise<StoredValue | undefined>;
  setItem(key: string, value: StoredValue): Promise<void>;
  removeItem(key: string): Promise<void>;
}

async function getStorage(storage?: PresetStorage): Promise<PresetStorage> {
  if (storage) return storage;
  const { LocalStorage } = await import("@raycast/api");
  return LocalStorage;
}

export async function loadPresets(
  storage?: PresetStorage,
): Promise<PromptPreset[]> {
  const localStorage = await getStorage(storage);
  const items = await localStorage.allItems();
  const deletedIds = new Set(
    Object.keys(items)
      .filter((key) => key.startsWith(DELETED_PRESET_STORAGE_PREFIX))
      .map((key) => key.slice(DELETED_PRESET_STORAGE_PREFIX.length)),
  );
  const presetsById = new Map<string, PromptPreset>();

  for (const [key, value] of Object.entries(items)) {
    if (!key.startsWith(PRESET_STORAGE_PREFIX)) continue;
    const preset = deserializePreset(value);
    if (preset && !deletedIds.has(preset.id))
      presetsById.set(preset.id, preset);
  }

  const legacyValue = items[PRESETS_STORAGE_KEY];
  if (legacyValue !== undefined) {
    const legacyPresets = deserializeLegacyPresets(legacyValue);
    if (!legacyPresets) {
      throw new Error(
        "Stored legacy presets could not be migrated. The original data was kept.",
      );
    }

    for (const preset of legacyPresets) {
      if (deletedIds.has(preset.id) || presetsById.has(preset.id)) continue;
      await localStorage.setItem(
        presetStorageKey(preset.id),
        JSON.stringify(preset),
      );
      presetsById.set(preset.id, preset);
    }
    await localStorage.removeItem(PRESETS_STORAGE_KEY);
  }

  return [...presetsById.values()].sort(
    (left, right) =>
      left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
  );
}

export async function loadPreset(
  id: string,
  storage?: PresetStorage,
): Promise<PromptPreset | undefined> {
  const localStorage = await getStorage(storage);
  const deletedKey = deletedPresetStorageKey(id);
  if ((await localStorage.getItem(deletedKey)) !== undefined) return undefined;

  const preset = deserializePreset(
    await localStorage.getItem(presetStorageKey(id)),
  );
  if ((await localStorage.getItem(deletedKey)) !== undefined) return undefined;
  return preset?.id === id ? preset : undefined;
}

export async function upsertPreset(
  preset: PromptPreset,
  storage?: PresetStorage,
): Promise<void> {
  const localStorage = await getStorage(storage);
  const deletedKey = deletedPresetStorageKey(preset.id);
  if ((await localStorage.getItem(deletedKey)) !== undefined) {
    throw new Error("This preset was deleted in another Raycast window");
  }

  const key = presetStorageKey(preset.id);
  await localStorage.setItem(key, JSON.stringify(preset));

  if ((await localStorage.getItem(deletedKey)) !== undefined) {
    await localStorage.removeItem(key);
    throw new Error("This preset was deleted in another Raycast window");
  }
}

export async function deletePreset(
  id: string,
  storage?: PresetStorage,
): Promise<void> {
  const localStorage = await getStorage(storage);
  const deletedKey = deletedPresetStorageKey(id);
  const presetKey = presetStorageKey(id);
  await localStorage.setItem(deletedKey, Date.now());
  if ((await localStorage.getItem(deletedKey)) === undefined) {
    throw new Error("Could not record the preset deletion");
  }

  await localStorage.removeItem(presetKey);
  if ((await localStorage.getItem(presetKey)) !== undefined) {
    await localStorage.removeItem(presetKey);
  }
}
