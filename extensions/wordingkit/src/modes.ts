import { LocalStorage } from "@raycast/api";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "./language.ts";
import { getUiStrings } from "./i18n.ts";
import { getLanguagePreset } from "./tones.ts";
import { isProvider, type Provider } from "./provider-registry.ts";
export type { Provider } from "./provider-registry.ts";

export type EditingMode = {
  id: string;
  title: string;
  description?: string;
  provider: Provider;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  lastUsedAt?: string;
};

export const MODE_STORAGE_KEY = "editing-modes";
export const MODE_STORAGE_VERSION = 3;

export type SortMode = "custom" | "last-used";
export type MoveDirection = "up" | "down";
export type ModeSettings = {
  language: Language;
  sortMode: SortMode;
  modes: EditingMode[];
};

const DEFAULT_TEMPERATURE = 0.2;
const DEFAULT_MAX_TOKENS = 4096;
const DAMAGED_STORAGE_MESSAGE = getUiStrings(DEFAULT_LANGUAGE).damagedStorage;

type StoredModeDocument = ModeSettings & {
  version: typeof MODE_STORAGE_VERSION;
};

type LegacyStoredModeDocument = {
  version: 1 | 2;
  sortMode?: SortMode;
  modes: EditingMode[];
};

let mutationQueue = Promise.resolve();

function queueMutation<T>(operation: () => Promise<T>): Promise<T> {
  const result = mutationQueue.then(operation, operation);
  mutationQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function generateModeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function createDefaultModes(
  language: Language = DEFAULT_LANGUAGE,
): EditingMode[] {
  const preset = getLanguagePreset(language);
  return preset.styles.map(({ id, title, subtitle }) => ({
    id: generateModeId(),
    title,
    description: subtitle,
    provider: preset.defaultProvider,
    model: preset.defaultModel,
    systemPrompt: preset.prompts[id]!,
    temperature: DEFAULT_TEMPERATURE,
    maxTokens: DEFAULT_MAX_TOKENS,
  }));
}

function isEditingModeRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSortMode(value: unknown): value is SortMode {
  return value === "custom" || value === "last-used";
}

function isIsoTimestamp(value: string): boolean {
  const timestamp = Date.parse(value);
  return (
    !Number.isNaN(timestamp) && new Date(timestamp).toISOString() === value
  );
}

export function validateEditingMode(
  value: unknown,
  language: Language = DEFAULT_LANGUAGE,
): EditingMode {
  const ui = getUiStrings(language);
  if (!isEditingModeRecord(value)) {
    throw new Error(ui.invalidModeField("data"));
  }

  const {
    id,
    title,
    description,
    provider,
    model,
    systemPrompt,
    temperature,
    maxTokens,
    lastUsedAt,
  } = value;

  if (typeof id !== "string" || !id.trim()) {
    throw new Error(ui.invalidModeField("identifier"));
  }
  if (typeof title !== "string" || !title.trim()) {
    throw new Error(ui.invalidModeField(ui.title));
  }
  if (description !== undefined && typeof description !== "string") {
    throw new Error(ui.invalidModeField(ui.description));
  }
  if (typeof model !== "string" || !model.trim()) {
    throw new Error(ui.invalidModeField(ui.model));
  }
  if (typeof systemPrompt !== "string" || !systemPrompt.trim()) {
    throw new Error(ui.invalidModeField(ui.systemPrompt));
  }
  if (!isProvider(provider)) {
    throw new Error(ui.invalidModeField(ui.provider));
  }
  if (
    typeof temperature !== "number" ||
    !Number.isFinite(temperature) ||
    temperature < 0 ||
    temperature > 2
  ) {
    throw new Error(ui.invalidModeField(ui.temperature));
  }
  if (
    typeof maxTokens !== "number" ||
    !Number.isInteger(maxTokens) ||
    maxTokens <= 0
  ) {
    throw new Error(ui.invalidModeField(ui.maxTokens));
  }
  if (
    lastUsedAt !== undefined &&
    (typeof lastUsedAt !== "string" || !isIsoTimestamp(lastUsedAt))
  ) {
    throw new Error(ui.invalidModeField("last used date"));
  }

  return {
    id: id.trim(),
    title: title.trim(),
    ...(description === undefined ? {} : { description: description.trim() }),
    provider,
    model: model.trim(),
    systemPrompt: systemPrompt.trim(),
    temperature,
    maxTokens,
    ...(lastUsedAt === undefined ? {} : { lastUsedAt }),
  };
}

function damagedStorageError(): Error {
  return new Error(DAMAGED_STORAGE_MESSAGE);
}

function validateStoredModeDocument(value: unknown): StoredModeDocument {
  try {
    if (
      !isEditingModeRecord(value) ||
      value.version !== MODE_STORAGE_VERSION ||
      !isLanguage(value.language) ||
      !isSortMode(value.sortMode)
    ) {
      throw damagedStorageError();
    }
    if (!Array.isArray(value.modes)) {
      throw damagedStorageError();
    }
    const language = value.language;

    return {
      version: MODE_STORAGE_VERSION,
      language,
      sortMode: value.sortMode,
      modes: value.modes.map((mode) => validateEditingMode(mode, language)),
    };
  } catch {
    throw damagedStorageError();
  }
}

function validateLegacyStoredModeDocument(
  value: unknown,
): LegacyStoredModeDocument {
  try {
    if (
      !isEditingModeRecord(value) ||
      (value.version !== 1 && value.version !== 2) ||
      !Array.isArray(value.modes)
    ) {
      throw damagedStorageError();
    }

    return {
      version: value.version,
      ...(value.version === 2 && isSortMode(value.sortMode)
        ? { sortMode: value.sortMode }
        : {}),
      modes: value.modes.map((mode) => validateEditingMode(mode)),
    };
  } catch {
    throw damagedStorageError();
  }
}

function validateSortMode(value: unknown): SortMode {
  if (!isSortMode(value)) {
    throw new Error(getUiStrings(DEFAULT_LANGUAGE).unsupportedSort);
  }
  return value;
}

async function persistModeSettings(
  settings: ModeSettings,
): Promise<ModeSettings> {
  const document = validateStoredModeDocument({
    version: MODE_STORAGE_VERSION,
    ...settings,
  });
  await LocalStorage.setItem(MODE_STORAGE_KEY, JSON.stringify(document));
  return {
    language: document.language,
    sortMode: document.sortMode,
    modes: document.modes,
  };
}

async function loadModeSettingsUnlocked(): Promise<ModeSettings> {
  const stored = await LocalStorage.getItem(MODE_STORAGE_KEY);
  if (stored === null || stored === undefined) {
    return persistModeSettings({
      language: DEFAULT_LANGUAGE,
      sortMode: "custom",
      modes: createDefaultModes(DEFAULT_LANGUAGE),
    });
  }

  if (typeof stored !== "string") {
    throw damagedStorageError();
  }

  try {
    const parsed = JSON.parse(stored);
    if (
      isEditingModeRecord(parsed) &&
      (parsed.version === 1 || parsed.version === 2)
    ) {
      const legacyDocument = validateLegacyStoredModeDocument(parsed);
      return persistModeSettings({
        language: DEFAULT_LANGUAGE,
        sortMode: legacyDocument.sortMode ?? "custom",
        modes: legacyDocument.modes,
      });
    }
    const document = validateStoredModeDocument(parsed);
    return {
      language: document.language,
      sortMode: document.sortMode,
      modes: document.modes,
    };
  } catch {
    throw damagedStorageError();
  }
}

export async function loadModeSettings(): Promise<ModeSettings> {
  return queueMutation(loadModeSettingsUnlocked);
}

export async function loadModes(): Promise<EditingMode[]> {
  return (await loadModeSettings()).modes;
}

export async function resetModes(): Promise<EditingMode[]> {
  return queueMutation(async () => {
    let language: Language = DEFAULT_LANGUAGE;
    try {
      language = (await loadModeSettingsUnlocked()).language;
    } catch {
      // Reset is the explicit recovery path for damaged storage.
    }
    const settings = await persistModeSettings({
      language,
      sortMode: "custom",
      modes: createDefaultModes(language),
    });
    return settings.modes;
  });
}

export async function setLanguage(language: Language): Promise<ModeSettings> {
  return queueMutation(async () => {
    const settings = await loadModeSettingsUnlocked();
    return persistModeSettings({ ...settings, language });
  });
}

export async function createMode(
  input: Omit<EditingMode, "id">,
): Promise<EditingMode> {
  return queueMutation(async () => {
    const mode = validateEditingMode({ ...input, id: generateModeId() });
    const settings = await loadModeSettingsUnlocked();
    await persistModeSettings({
      ...settings,
      modes: [...settings.modes, mode],
    });
    return mode;
  });
}

export async function updateMode(mode: EditingMode): Promise<EditingMode> {
  return queueMutation(async () => {
    const validated = validateEditingMode(mode);
    const settings = await loadModeSettingsUnlocked();
    const index = settings.modes.findIndex(({ id }) => id === validated.id);
    if (index === -1) {
      throw new Error(getUiStrings(settings.language).modeNotFound);
    }
    const updated = validateEditingMode({
      ...validated,
      lastUsedAt: settings.modes[index]?.lastUsedAt,
    });

    await persistModeSettings({
      ...settings,
      modes: [
        ...settings.modes.slice(0, index),
        updated,
        ...settings.modes.slice(index + 1),
      ],
    });
    return updated;
  });
}

export async function deleteMode(id: string): Promise<void> {
  return queueMutation(async () => {
    const settings = await loadModeSettingsUnlocked();
    await persistModeSettings({
      ...settings,
      modes: settings.modes.filter((mode) => mode.id !== id),
    });
  });
}

export async function setSortMode(sortMode: SortMode): Promise<ModeSettings> {
  return queueMutation(async () => {
    const settings = await loadModeSettingsUnlocked();
    return persistModeSettings({
      ...settings,
      sortMode: validateSortMode(sortMode),
    });
  });
}

export async function moveMode(
  id: string,
  direction: MoveDirection,
): Promise<EditingMode[]> {
  return queueMutation(async () => {
    const settings = await loadModeSettingsUnlocked();
    const index = settings.modes.findIndex((mode) => mode.id === id);
    if (index === -1) {
      throw new Error(getUiStrings(settings.language).modeNotFound);
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= settings.modes.length) {
      return settings.modes;
    }

    const modes = [...settings.modes];
    [modes[index], modes[targetIndex]] = [modes[targetIndex]!, modes[index]!];
    const updated = await persistModeSettings({ ...settings, modes });
    return updated.modes;
  });
}

export async function markModeUsed(
  id: string,
  lastUsedAt: string,
): Promise<EditingMode> {
  return queueMutation(async () => {
    const settings = await loadModeSettingsUnlocked();
    const index = settings.modes.findIndex((mode) => mode.id === id);
    if (index === -1) {
      throw new Error(getUiStrings(settings.language).modeNotFound);
    }

    const updated = validateEditingMode({
      ...settings.modes[index],
      lastUsedAt,
    });
    await persistModeSettings({
      ...settings,
      modes: [
        ...settings.modes.slice(0, index),
        updated,
        ...settings.modes.slice(index + 1),
      ],
    });
    return updated;
  });
}

export function sortModes(
  modes: EditingMode[],
  sortMode: SortMode,
): EditingMode[] {
  if (sortMode === "custom") {
    return modes;
  }

  return modes
    .map((mode, index) => ({ mode, index }))
    .sort(
      (
        { mode: left, index: leftIndex },
        { mode: right, index: rightIndex },
      ) => {
        if (!left.lastUsedAt)
          return right.lastUsedAt ? 1 : leftIndex - rightIndex;
        if (!right.lastUsedAt) return -1;
        return (
          Date.parse(right.lastUsedAt) - Date.parse(left.lastUsedAt) ||
          leftIndex - rightIndex
        );
      },
    )
    .map(({ mode }) => mode);
}
