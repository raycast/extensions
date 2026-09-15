export const MODEL_MIGRATIONS: Record<string, string> = {
  // Google's documented replacements (see ai.google.dev/gemini-api/docs/deprecations).
  // Note: there is currently no stable "Gemini 3.5 Pro" model broadly available yet, so
  // gemini-2.5-pro maps to gemini-3.5-flash, matching Google's official recommended replacement.
  "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
  "gemini-2.5-flash": "gemini-3.6-flash",
  "gemini-2.5-pro": "gemini-3.5-flash",
  "gemini-3-flash-preview": "gemini-3.6-flash",
};

// Hardcoded fallback used when no persisted active model or custom model is set.
export const DEFAULT_MODEL = "gemini-3.5-flash-lite";

// Maps a known-deprecated model name to its current replacement. Unknown/current
// model names are returned unchanged (never undefined).
export function normalizeModelName(modelName: string | undefined): string | undefined {
  if (!modelName) {
    return modelName;
  }
  return MODEL_MIGRATIONS[modelName] ?? modelName;
}
