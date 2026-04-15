export type Provider = "openai" | "anthropic" | "gemini";

export type ParsedModel = {
  provider: Provider;
  modelId: string;
};

/** Matches `package.json` preferences `model.data` (single source for forms). */
export const MODEL_PREFERENCE_OPTIONS: { title: string; value: string }[] = [
  { title: "OpenAI — GPT-4o mini", value: "openai:gpt-4o-mini" },
  { title: "OpenAI — GPT-4o", value: "openai:gpt-4o" },
  { title: "OpenAI — GPT-4.1 mini", value: "openai:gpt-4.1-mini" },
  { title: "OpenAI — GPT-4.1", value: "openai:gpt-4.1" },
  { title: "Anthropic — Claude Sonnet 4", value: "anthropic:claude-sonnet-4-20250514" },
  { title: "Anthropic — Claude Haiku 4.5", value: "anthropic:claude-haiku-4-5-20251001" },
  { title: "Google — Gemini 2.5 Flash", value: "gemini:gemini-2.5-flash" },
  { title: "Google — Gemini 2.5 Pro", value: "gemini:gemini-2.5-pro" },
  { title: "Google — Gemini 2.0 Flash", value: "gemini:gemini-2.0-flash" },
];

/** Preference value format: `provider:modelId` (e.g. `openai:gpt-4o-mini`). */
export function parseModelPreference(value: string): ParsedModel {
  const idx = value.indexOf(":");
  if (idx <= 0) {
    return { provider: "openai", modelId: value || "gpt-4o-mini" };
  }
  const provider = value.slice(0, idx) as Provider;
  const modelId = value.slice(idx + 1);
  if (provider !== "openai" && provider !== "anthropic" && provider !== "gemini") {
    return { provider: "openai", modelId: value };
  }
  return { provider, modelId };
}

/** Empty or whitespace `override` falls back to saved preference. */
export function effectiveModelPreference(prefsModel: string | undefined, override: string | undefined): string {
  const fromPref = prefsModel?.trim() || "openai:gpt-4o-mini";
  const o = override?.trim();
  return o || fromPref;
}

export function modelTitleForValue(value: string): string {
  return MODEL_PREFERENCE_OPTIONS.find((o) => o.value === value)?.title ?? value;
}
