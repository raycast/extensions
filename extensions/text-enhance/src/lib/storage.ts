import { LocalStorage } from "@raycast/api";

export type PurposeId =
  | "general"
  | "email"
  | "telegram"
  | "slack"
  | "proposal"
  | "reply"
  | "follow-up"
  | "professional-update"
  | "meeting-summary"
  | "announcement"
  | "customer-support"
  | "social-post"
  | "personal-message"
  | "sensitive-message"
  | "request";
export type EnhancementId =
  | "clarity"
  | "grammar"
  | "polish"
  | "shorten"
  | "expand"
  | "funny"
  | "sarcastic"
  | "persuasive"
  | "warmer"
  | "stronger";
export type ToneId =
  | "natural"
  | "professional"
  | "friendly"
  | "confident"
  | "direct"
  | "warm"
  | "playful"
  | "empathetic"
  | "formal"
  | "persuasive"
  | "humble"
  | "energetic";
export type ModelId =
  | "claude-4-sonnet"
  | "claude-4.6-sonnet"
  | "gpt-5-mini"
  | "gpt-5"
  | "gpt-5.1"
  | "gpt-5.2"
  | "gpt-4.1"
  | "gpt-4.1-mini"
  | "claude-4.5-sonnet"
  | "claude-4.5-haiku"
  | "claude-4.5-opus"
  | "claude-4.6-opus"
  | "gemini-2.5-flash"
  | "gemini-2.5-pro"
  | "gemini-3-flash"
  | "gemini-3.1-pro"
  | "gemini-3.1-flash-lite"
  | "gemini-2.5-flash-lite"
  | "perplexity-sonar"
  | "perplexity-sonar-pro"
  | "grok-4.1-fast"
  | "grok-4"
  | "mistral-large"
  | "mistral-medium"
  | "mistral-small-3"
  | "deepseek-v3"
  | "deepseek-r1"
  | "qwen3-32b"
  | "kimi-k2-instruct"
  | "gpt-4o-mini"
  | "gpt-4o"
  | "claude-sonnet"
  | "gemini-2-flash";
export type CreativityId = "low" | "balanced" | "high";

export type FormValues = {
  draft: string;
  purpose: PurposeId;
  enhancement: EnhancementId;
  tone: ToneId;
  customPrompt: string;
  model: ModelId;
  creativity: CreativityId;
};

export type SavedPreset = {
  id: string;
  name: string;
  purpose: PurposeId;
  enhancement: EnhancementId;
  tone: ToneId;
  customPrompt: string;
  model: ModelId;
  creativity: CreativityId;
};

export type RememberedSettings = Omit<FormValues, "draft">;

export type HistoryEntry = {
  id: string;
  createdAt: string;
  values: FormValues;
  result: string;
};

export const PRESET_STORAGE_KEY = "named-presets";
export const HISTORY_STORAGE_KEY = "generation-history";
export const LAST_USED_SETTINGS_STORAGE_KEY = "last-used-settings";
export const NO_PRESET = "none";
const MAX_HISTORY_ITEMS = 50;

const LEGACY_MODEL_MAP: Partial<Record<ModelId, ModelId>> = {
  "claude-sonnet": "claude-4.5-sonnet",
  "gemini-2-flash": "gemini-2.5-flash",
  "gpt-4o-mini": "gpt-4.1-mini",
  "gpt-4o": "gpt-4.1",
};

export function normalizeModelId(modelId: ModelId | undefined): ModelId {
  if (!modelId) {
    return "claude-4.5-sonnet";
  }

  return LEGACY_MODEL_MAP[modelId] ?? modelId;
}

export async function loadPresets(): Promise<SavedPreset[]> {
  const raw = await LocalStorage.getItem<string>(PRESET_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? sortPresets(
          (parsed as SavedPreset[]).map((preset) => ({
            ...preset,
            model: normalizeModelId(preset.model),
          })),
        )
      : [];
  } catch {
    return [];
  }
}

export async function savePresets(presets: SavedPreset[]) {
  await LocalStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

export function sortPresets(presets: SavedPreset[]) {
  return [...presets].sort((a, b) => a.name.localeCompare(b.name));
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(HISTORY_STORAGE_KEY);

  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export async function saveHistory(entries: HistoryEntry[]) {
  await LocalStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries));
}

export async function appendHistory(entry: HistoryEntry) {
  const current = await loadHistory();
  const next = [entry, ...current].slice(0, MAX_HISTORY_ITEMS);
  await saveHistory(next);
}

export async function loadLastUsedSettings(): Promise<RememberedSettings | null> {
  const raw = await LocalStorage.getItem<string>(
    LAST_USED_SETTINGS_STORAGE_KEY,
  );

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed
      ? ({
          ...(parsed as RememberedSettings),
          model: normalizeModelId((parsed as RememberedSettings).model),
        } as RememberedSettings)
      : null;
  } catch {
    return null;
  }
}

export async function saveLastUsedSettings(settings: RememberedSettings) {
  await LocalStorage.setItem(
    LAST_USED_SETTINGS_STORAGE_KEY,
    JSON.stringify(settings),
  );
}

export async function clearLastUsedSettings() {
  await LocalStorage.removeItem(LAST_USED_SETTINGS_STORAGE_KEY);
}
