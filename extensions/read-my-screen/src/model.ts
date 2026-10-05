import modelPreferences from "./model-preferences.json";

export type Provider = "openai" | "anthropic" | "gemini";

export type ParsedModel = {
  provider: Provider;
  modelId: string;
};

/** Single source: `src/model-preferences.json` (synced to package.json via npm run sync-model-prefs). */
export const DEFAULT_MODEL_PREFERENCE = modelPreferences.default;

/** Matches Raycast preferences `model.data` (synced from model-preferences.json). */
export const MODEL_PREFERENCE_OPTIONS: { title: string; value: string }[] = modelPreferences.options;

/** Saved preference, or the extension default when unset. */
export function resolvedModelPreference(prefsModel: string | undefined): string {
  return prefsModel?.trim() || DEFAULT_MODEL_PREFERENCE;
}

/** Per-session model override, then saved preference, then extension default. */
export function effectiveSessionModelPreference(
  sessionModel: string | undefined,
  prefsModel: string | undefined,
): string {
  return sessionModel?.trim() || resolvedModelPreference(prefsModel);
}

/** Preference value format: `provider:modelId` (e.g. `openai:gpt-5.6-luna`). */
export function parseModelPreference(value: string): ParsedModel {
  const normalized = value.trim() || DEFAULT_MODEL_PREFERENCE;
  const idx = normalized.indexOf(":");
  if (idx <= 0) {
    return { provider: "openai", modelId: normalized };
  }
  const provider = normalized.slice(0, idx) as Provider;
  const modelId = normalized.slice(idx + 1);
  if (provider !== "openai" && provider !== "anthropic" && provider !== "gemini") {
    return { provider: "openai", modelId: normalized };
  }
  return { provider, modelId };
}

/** Empty or whitespace `override` falls back to saved preference (then default). */
export function effectiveModelPreference(prefsModel: string | undefined, override: string | undefined): string {
  const o = override?.trim();
  return o || resolvedModelPreference(prefsModel);
}

export function modelTitleForValue(value: string): string {
  return MODEL_PREFERENCE_OPTIONS.find((o) => o.value === value)?.title ?? value;
}
