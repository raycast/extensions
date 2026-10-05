import { LocalStorage, getPreferenceValues } from "@raycast/api";
import type { MimoTTSModel } from "../api/mimo-types";
import { DEFAULT_MODEL, DEFAULT_VOICE, normalizeVoiceForModel } from "../constants/mimo-voices";

export interface MimoProviderSettings {
  model: MimoTTSModel;
  defaultVoice: string;
  speechRate: string;
  stylePrompt?: string;
  tokenPlanBaseUrl: string;
}

export interface MimoProviderSettingsInput {
  model?: string;
  defaultVoice?: string;
  speechRate?: string;
  stylePrompt?: string;
  tokenPlanBaseUrl?: string;
}

export const QUICK_SETUP_OVERRIDES_KEY = "raycast-mimo-tts:quick-setup-overrides";

const DEFAULT_TOKEN_PLAN_BASE_URL = "https://token-plan-cn.xiaomimimo.com/v1";

export const DEFAULT_MIMO_SETTINGS: MimoProviderSettings = {
  model: DEFAULT_MODEL,
  defaultVoice: DEFAULT_VOICE,
  speechRate: "0",
  stylePrompt: "",
  tokenPlanBaseUrl: DEFAULT_TOKEN_PLAN_BASE_URL,
};

/**
 * Read Mimo settings.
 *
 * Resolution order:
 * 1. LocalStorage override (written by Setup Voice Defaults)
 * 2. Raycast Preferences (mimoModel, mimoDefaultVoice, mimoSpeechRate, ...)
 * 3. Built-in defaults
 */
export async function getMimoSettings(): Promise<MimoProviderSettings> {
  const overrides = await getMimoSettingsOverrides();
  const preferences = readPreferencesAsInput();
  return normalizeMimoSettings({ ...preferences, ...overrides });
}

export async function getMimoSettingsOverrides(): Promise<MimoProviderSettingsInput | null> {
  const raw = await LocalStorage.getItem<string>(QUICK_SETUP_OVERRIDES_KEY);
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    return parsed as MimoProviderSettingsInput;
  } catch {
    await LocalStorage.removeItem(QUICK_SETUP_OVERRIDES_KEY);
    return null;
  }
}

export async function saveMimoSettingsOverrides(settings: MimoProviderSettingsInput): Promise<MimoProviderSettings> {
  const normalized = normalizeMimoSettings(settings);
  await LocalStorage.setItem(QUICK_SETUP_OVERRIDES_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function clearMimoSettingsOverrides(): Promise<void> {
  await LocalStorage.removeItem(QUICK_SETUP_OVERRIDES_KEY);
}

function readPreferencesAsInput(): MimoProviderSettingsInput {
  const prefs = getPreferenceValues<Preferences>();
  return {
    model: prefs.mimoModel,
    defaultVoice: prefs.mimoDefaultVoice,
    speechRate: prefs.mimoSpeechRate,
    stylePrompt: prefs.mimoStylePrompt,
    tokenPlanBaseUrl: prefs.mimoTokenPlanBaseUrl,
  };
}

function normalizeMimoSettings(settings: MimoProviderSettingsInput | undefined): MimoProviderSettings {
  const model = settings?.model === "mimo-v2-tts" ? "mimo-v2-tts" : DEFAULT_MODEL;
  return {
    model,
    defaultVoice: normalizeVoiceForModel(settings?.defaultVoice || DEFAULT_VOICE, model),
    speechRate: normalizeSpeechRate(settings?.speechRate),
    stylePrompt: settings?.stylePrompt?.trim() || "",
    tokenPlanBaseUrl:
      settings?.tokenPlanBaseUrl
        ?.trim()
        .replace(/\/+$/, "")
        .replace(/\/chat\/completions$/, "") || DEFAULT_TOKEN_PLAN_BASE_URL,
  };
}

function normalizeSpeechRate(rate: string | undefined): string {
  return ["-50", "-25", "0", "25", "50", "75", "100"].includes(rate ?? "") ? rate! : "0";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
