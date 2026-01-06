import { getPreferenceValues } from "@raycast/api";
import { getProvider, ProviderType, DEFAULT_MODELS } from "./providers";
import { EnhancementStyle, STYLE_PROMPTS } from "./styles";

interface Preferences {
  provider: ProviderType;
  model: string;
  enhancementStyle: EnhancementStyle;
  customSystemPrompt: string;
  // Provider API keys
  openrouterApiKey: string;
  geminiApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  groqApiKey: string;
  // Ollama doesn't need an API key
  autoUseClipboard: boolean;
}

function getApiKeyForProvider(
  preferences: Preferences,
  providerType: ProviderType,
): string {
  switch (providerType) {
    case "openrouter":
      return preferences.openrouterApiKey || "";
    case "gemini":
      return preferences.geminiApiKey || "";
    case "openai":
      return preferences.openaiApiKey || "";
    case "anthropic":
      return preferences.anthropicApiKey || "";
    case "groq":
      return preferences.groqApiKey || "";
    case "ollama":
      return ""; // Ollama doesn't need an API key
    default:
      return "";
  }
}

export interface EnhanceResult {
  enhancedPrompt: string;
  provider: string;
  model: string;
  style: string;
}

export interface EnhanceOptions {
  styleOverride?: EnhancementStyle;
  providerOverride?: ProviderType;
  modelOverride?: string;
}

export async function enhancePrompt(
  prompt: string,
  options?: EnhanceOptions,
): Promise<EnhanceResult> {
  const preferences = getPreferenceValues<Preferences>();

  // Use overrides if provided, otherwise fall back to preferences
  const providerType =
    options?.providerOverride || preferences.provider || "openrouter";
  const provider = getProvider(providerType);
  const model =
    options?.modelOverride || preferences.model || DEFAULT_MODELS[providerType];
  const apiKey = getApiKeyForProvider(preferences, providerType);
  const style =
    options?.styleOverride || preferences.enhancementStyle || "balanced";

  if (!apiKey && providerType !== "ollama") {
    throw new Error(
      `No API key configured for ${provider.name}. Please set it in extension preferences.`,
    );
  }

  // Build system prompt with optional custom instructions
  let systemPrompt = STYLE_PROMPTS[style];
  if (preferences.customSystemPrompt && preferences.customSystemPrompt.trim()) {
    systemPrompt += `\n\nAdditional instructions from user:\n${preferences.customSystemPrompt.trim()}`;
  }

  const enhancedPrompt = await provider.sendMessage(
    prompt,
    systemPrompt,
    model,
    apiKey,
  );

  return {
    enhancedPrompt,
    provider: provider.name,
    model,
    style,
  };
}
