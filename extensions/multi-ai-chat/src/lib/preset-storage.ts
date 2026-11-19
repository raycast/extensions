import {
  DELETED_PRESET_STORAGE_PREFIX,
  deletedPresetStorageKey,
  deserializeLegacyPresets,
  deserializePreset,
  PRESET_STORAGE_PREFIX,
  PRESETS_STORAGE_KEY,
  presetStorageKey,
  serializeStoredPreset,
  storedPresetUpdatedAt,
  UPDATED_PRESET_STORAGE_PREFIX,
  updatedPresetStorageKey,
  validPresetTimestamp,
  type PromptPreset,
} from "./presets.js";
import {
  synchronizePresetsWithICloud,
  SyncLocalStorageError,
} from "./icloud-preset-sync.js";
import {
  PRESET_STORAGE_LOCK_DIRECTORY,
  withPresetStorageLock,
} from "./preset-storage-lock.js";

type StoredValue = string | number | boolean;

export interface PresetStorage {
  allItems(): Promise<Record<string, StoredValue>>;
  getItem(key: string): Promise<StoredValue | undefined>;
  setItem(key: string, value: StoredValue): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export interface PresetStorageOptions {
  onSyncError?: (error: Error) => void;
  synchronize?: (storage: PresetStorage) => Promise<void>;
  now?: () => number;
  lockDirectory?: string;
}

async function withStorage<T>(
  storage: PresetStorage | undefined,
  options: PresetStorageOptions,
  operation: (
    storage: PresetStorage,
    synchronize: () => Promise<void>,
  ) => Promise<T>,
): Promise<T> {
  const localStorage = storage ?? (await import("@raycast/api")).LocalStorage;
  const lockDirectory = options.lockDirectory ?? PRESET_STORAGE_LOCK_DIRECTORY;
  const synchronize =
    options.synchronize ??
    (storage
      ? undefined
      : (local: PresetStorage) =>
          synchronizePresetsWithICloud(local, { lockDirectory }));

  return withPresetStorageLock(lockDirectory, async () => {
    let syncError: Error | undefined;
    const attemptSync = async (localCommitted = false) => {
      if (!synchronize) return;
      try {
        await synchronize(localStorage);
        syncError = undefined;
      } catch (error) {
        if (error instanceof SyncLocalStorageError && !localCommitted)
          throw error;
        syncError = error instanceof Error ? error : new Error(String(error));
      }
    };
    await attemptSync();
    const result = await operation(localStorage, () => attemptSync(true));
    if (syncError) {
      // Notification failures cannot turn a committed local save into a failure.
      try {
        options.onSyncError?.(syncError);
      } catch {
        // The caller may report sync status, but cannot roll back this commit.
      }
    }
    return result;
  });
}

export async function loadPresets(
  storage?: PresetStorage,
  options: PresetStorageOptions = {},
): Promise<PromptPreset[]> {
  return withStorage(storage, options, async (localStorage, synchronize) => {
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
        const value = serializeStoredPreset(
          preset,
          nextRevision(items, options.now ?? Date.now),
        );
        await localStorage.setItem(presetStorageKey(preset.id), value);
        items[presetStorageKey(preset.id)] = value;
        presetsById.set(preset.id, preset);
      }
      await localStorage.removeItem(PRESETS_STORAGE_KEY);
      await synchronize();
    }

    return [...presetsById.values()].sort(
      (left, right) =>
        left.name.localeCompare(right.name) || left.id.localeCompare(right.id),
    );
  });
}

export async function loadPreset(
  id: string,
  storage?: PresetStorage,
  options: PresetStorageOptions = {},
): Promise<PromptPreset | undefined> {
  return withStorage(storage, options, async (localStorage) => {
    const deletedKey = deletedPresetStorageKey(id);
    if ((await localStorage.getItem(deletedKey)) !== undefined)
      return undefined;

    const preset = deserializePreset(
      await localStorage.getItem(presetStorageKey(id)),
    );
    if ((await localStorage.getItem(deletedKey)) !== undefined)
      return undefined;
    return preset?.id === id ? preset : undefined;
  });
}

export async function upsertPreset(
  preset: PromptPreset,
  storage?: PresetStorage,
  options: PresetStorageOptions = {},
): Promise<void> {
  return withStorage(storage, options, async (localStorage, synchronize) => {
    const deletedKey = deletedPresetStorageKey(preset.id);
    if ((await localStorage.getItem(deletedKey)) !== undefined) {
      throw new Error("This preset was deleted in another Raycast window");
    }

    const key = presetStorageKey(preset.id);
    const revision = nextRevision(
      await localStorage.allItems(),
      options.now ?? Date.now,
    );
    await localStorage.setItem(key, serializeStoredPreset(preset, revision));

    if ((await localStorage.getItem(deletedKey)) !== undefined) {
      await localStorage.removeItem(key);
      throw new Error("This preset was deleted in another Raycast window");
    }
    await synchronize();
  });
}

export async function deletePreset(
  id: string,
  storage?: PresetStorage,
  options: PresetStorageOptions = {},
): Promise<void> {
  return withStorage(storage, options, async (localStorage, synchronize) => {
    const deletedKey = deletedPresetStorageKey(id);
    const presetKey = presetStorageKey(id);
    const revision = nextRevision(
      await localStorage.allItems(),
      options.now ?? Date.now,
    );
    await localStorage.setItem(deletedKey, revision);
    if ((await localStorage.getItem(deletedKey)) === undefined) {
      throw new Error("Could not record the preset deletion");
    }

    await localStorage.removeItem(presetKey);
    await localStorage.removeItem(updatedPresetStorageKey(id));
    if ((await localStorage.getItem(presetKey)) !== undefined) {
      await localStorage.removeItem(presetKey);
    }
    await synchronize();
  });
}

function nextRevision(
  items: Record<string, StoredValue>,
  now: () => number,
): number {
  let latest = 0;
  for (const [key, value] of Object.entries(items)) {
    const revision = key.startsWith(PRESET_STORAGE_PREFIX)
      ? storedPresetUpdatedAt(value)
      : key.startsWith(UPDATED_PRESET_STORAGE_PREFIX) ||
          key.startsWith(DELETED_PRESET_STORAGE_PREFIX)
        ? validPresetTimestamp(value)
        : undefined;
    if (revision !== undefined) latest = Math.max(latest, revision);
  }
  const revision = Math.max(now(), latest + 1);
  if (validPresetTimestamp(revision) === undefined) {
    throw new Error("Could not create a newer saved prompt revision");
  }
  return revision;
}
