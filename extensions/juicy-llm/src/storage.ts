import { LocalStorage } from "@raycast/api";
import crypto from "crypto";
import type {
  CommandConfig,
  CreateOrUpdate,
  CustomPrompt,
  HistoryEntry,
  ModelPreset,
  Provider,
  ProviderConfig,
} from "./types";

const KEYS = {
  MODEL_PRESETS: "model_presets",
  CUSTOM_PROMPTS: "custom_prompts",
  COMMAND_CONFIG: "command_config",
  PROVIDER_CONFIGS: "provider_configs",
  HISTORY: "history",
  INITIALIZED: "initialized",
} as const;

function generateId(): string {
  return crypto.randomUUID();
}

// --- Model Presets ---

export async function getModelPresets(): Promise<ModelPreset[]> {
  const raw = await LocalStorage.getItem<string>(KEYS.MODEL_PRESETS);
  return raw ? JSON.parse(raw) : [];
}

export async function getModelPreset(
  id: string,
): Promise<ModelPreset | undefined> {
  const presets = await getModelPresets();
  return presets.find((p) => p.id === id);
}

export async function saveModelPreset(
  preset: CreateOrUpdate<ModelPreset>,
): Promise<ModelPreset> {
  const presets = await getModelPresets();
  const saved: ModelPreset = { ...preset, id: preset.id ?? generateId() };
  const index = presets.findIndex((p) => p.id === saved.id);
  if (index >= 0) {
    presets[index] = saved;
  } else {
    presets.push(saved);
  }
  await LocalStorage.setItem(KEYS.MODEL_PRESETS, JSON.stringify(presets));
  return saved;
}

export async function deleteModelPreset(id: string): Promise<void> {
  const presets = await getModelPresets();
  await LocalStorage.setItem(
    KEYS.MODEL_PRESETS,
    JSON.stringify(presets.filter((p) => p.id !== id)),
  );
}

// --- Custom Prompts ---

export async function getCustomPrompts(): Promise<CustomPrompt[]> {
  const raw = await LocalStorage.getItem<string>(KEYS.CUSTOM_PROMPTS);
  return raw ? JSON.parse(raw) : [];
}

export async function getCustomPrompt(
  id: string,
): Promise<CustomPrompt | undefined> {
  const prompts = await getCustomPrompts();
  return prompts.find((p) => p.id === id);
}

export async function saveCustomPrompt(
  prompt: CreateOrUpdate<CustomPrompt>,
): Promise<CustomPrompt> {
  const prompts = await getCustomPrompts();
  const saved: CustomPrompt = { ...prompt, id: prompt.id ?? generateId() };
  const index = prompts.findIndex((p) => p.id === saved.id);
  if (index >= 0) {
    prompts[index] = saved;
  } else {
    prompts.push(saved);
  }
  await LocalStorage.setItem(KEYS.CUSTOM_PROMPTS, JSON.stringify(prompts));
  return saved;
}

export async function deleteCustomPrompt(id: string): Promise<void> {
  const prompts = await getCustomPrompts();
  await LocalStorage.setItem(
    KEYS.CUSTOM_PROMPTS,
    JSON.stringify(prompts.filter((p) => p.id !== id)),
  );
}

// --- Command Config ---

export async function getCommandConfig(): Promise<CommandConfig | undefined> {
  const raw = await LocalStorage.getItem<string>(KEYS.COMMAND_CONFIG);
  return raw ? JSON.parse(raw) : undefined;
}

export async function saveCommandConfig(config: CommandConfig): Promise<void> {
  await LocalStorage.setItem(KEYS.COMMAND_CONFIG, JSON.stringify(config));
}

// --- Provider Configs ---

export async function getProviderConfigs(): Promise<ProviderConfig[]> {
  const raw = await LocalStorage.getItem<string>(KEYS.PROVIDER_CONFIGS);
  return raw ? JSON.parse(raw) : [];
}

export async function getProviderConfig(
  provider: Provider,
): Promise<ProviderConfig | undefined> {
  const configs = await getProviderConfigs();
  return configs.find((c) => c.provider === provider);
}

export async function saveProviderConfig(
  config: ProviderConfig,
): Promise<void> {
  const configs = await getProviderConfigs();
  const index = configs.findIndex((c) => c.provider === config.provider);
  if (index >= 0) {
    configs[index] = config;
  } else {
    configs.push(config);
  }
  await LocalStorage.setItem(KEYS.PROVIDER_CONFIGS, JSON.stringify(configs));
}

export async function saveProviderConfigs(
  configs: ProviderConfig[],
): Promise<void> {
  await LocalStorage.setItem(KEYS.PROVIDER_CONFIGS, JSON.stringify(configs));
}

// --- History ---

const MAX_HISTORY_ENTRIES = 100;

export async function getHistory(): Promise<HistoryEntry[]> {
  const raw = await LocalStorage.getItem<string>(KEYS.HISTORY);
  return raw ? JSON.parse(raw) : [];
}

export async function addHistoryEntry(
  entry: Omit<HistoryEntry, "id" | "timestamp">,
): Promise<void> {
  const history = await getHistory();
  const newEntry: HistoryEntry = {
    ...entry,
    id: generateId(),
    timestamp: Date.now(),
  };
  history.unshift(newEntry);
  if (history.length > MAX_HISTORY_ENTRIES) {
    history.length = MAX_HISTORY_ENTRIES;
  }
  await LocalStorage.setItem(KEYS.HISTORY, JSON.stringify(history));
}

export async function deleteHistoryEntry(id: string): Promise<void> {
  const history = await getHistory();
  await LocalStorage.setItem(
    KEYS.HISTORY,
    JSON.stringify(history.filter((e) => e.id !== id)),
  );
}

export async function clearHistory(): Promise<void> {
  await LocalStorage.removeItem(KEYS.HISTORY);
}

// --- Initialization ---

export async function isInitialized(): Promise<boolean> {
  return (await LocalStorage.getItem<string>(KEYS.INITIALIZED)) === "true";
}

export async function markInitialized(): Promise<void> {
  await LocalStorage.setItem(KEYS.INITIALIZED, "true");
}
