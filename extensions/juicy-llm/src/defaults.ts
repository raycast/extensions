import {
  getModelPresets,
  getProviderConfigs,
  isInitialized,
  markInitialized,
  saveCustomPrompt,
  saveModelPreset,
  saveProviderConfigs,
} from "./storage";
import type { CustomPrompt, ModelPreset, ProviderConfig } from "./types";
import { PROVIDERS } from "./types";

const DEFAULT_MODEL_PRESETS: Omit<ModelPreset, "id">[] = [
  { name: "Fast", provider: "openai", model: "gpt-4o-mini", temperature: 0.3 },
  {
    name: "Smart",
    provider: "anthropic",
    model: "claude-sonnet-4-20250514",
    temperature: 0.7,
  },
];

const DEFAULT_CUSTOM_PROMPTS: Omit<CustomPrompt, "id" | "modelPresetId">[] = [
  {
    name: "Summarize",
    prompt:
      "Summarize the following text with bullet points, highlighting key points. Be concise and clear.",
    icon: "BulletPoints",
  },
  {
    name: "Business Tone",
    prompt:
      "Rewrite the following text in a business/formal tone. Maintain the original meaning while writing professionally.",
    icon: "Building",
  },
  {
    name: "O.R.E.O Method",
    prompt:
      "Rewrite the following text using the O.R.E.O method (Opinion-Reason-Example-Opinion). Structure it with a clear assertion, reasoning, examples, and conclusion.",
    icon: "Book",
  },
];

export async function seedDefaults(): Promise<void> {
  if (await isInitialized()) return;

  const savedPresets: ModelPreset[] = [];
  for (const preset of DEFAULT_MODEL_PRESETS) {
    const saved = await saveModelPreset(preset);
    savedPresets.push(saved);
  }

  const defaultPresetId = savedPresets[0].id;

  for (const prompt of DEFAULT_CUSTOM_PROMPTS) {
    const smartPreset = savedPresets.find((p) => p.name === "Smart");
    const presetId =
      prompt.name === "O.R.E.O Method"
        ? (smartPreset?.id ?? defaultPresetId)
        : defaultPresetId;
    await saveCustomPrompt({ ...prompt, modelPresetId: presetId });
  }

  await markInitialized();
}

async function ensureProviderConfigs(): Promise<void> {
  const existing = await getProviderConfigs();
  if (existing.length > 0) return;

  const configs: ProviderConfig[] = PROVIDERS.map((provider) => ({
    provider,
    enabled: true,
  }));
  await saveProviderConfigs(configs);
}

let defaultsEnsured = false;

export async function ensureDefaults(): Promise<void> {
  if (defaultsEnsured) return;
  await seedDefaults();
  await ensureProviderConfigs();
  defaultsEnsured = true;
}

export async function getDefaultPresetId(): Promise<string> {
  const presets = await getModelPresets();
  return presets[0]?.id ?? "";
}
