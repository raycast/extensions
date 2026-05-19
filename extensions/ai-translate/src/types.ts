export const PROVIDER_IDS = ["deepseek", "mimo", "minimax", "gemini", "kimi", "openai"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export type TranslationStyle = "balanced" | "faithful" | "polished" | "academic";

export type PromptProfile = "screenshot" | "general" | "technical" | "academic" | "legal" | "subtitle" | "custom";

export type ModelTier = "fast" | "pro" | "custom";

export type RewriteTone = "natural" | "casual" | "formal" | "concise";

export type OCREngine = "local" | "tesseract" | "baidu" | "gemini";

export type OCRTextLayout = "formatted" | "compact";

export type ProviderAPIProtocol = "openai" | "anthropic";

export interface RuntimeSettings {
  modelTier: ModelTier;
  promptProfile: PromptProfile;
  translationStyle: TranslationStyle;
  customPromptInstructions: string;
}

/**
 * Single source of truth for preferences is Raycast's generated `Preferences`
 * type (from `package.json`, emitted into `raycast-env.d.ts`). We re-export it
 * under the existing name so the rest of the codebase keeps importing
 * `ExtensionPreferences` from here, without hand-maintaining a duplicate that
 * can drift from the manifest.
 */
export type ExtensionPreferences = Preferences;

export interface ProviderConfig {
  id: ProviderId;
  title: string;
  apiKey: string;
  baseURL: string;
  model: string;
  apiProtocol?: ProviderAPIProtocol;
}

export interface TranslationRequest {
  text: string;
  targetLanguage: string;
  targetLanguageTitle: string;
  style: TranslationStyle;
  promptProfile: PromptProfile;
  customPromptInstructions?: string;
  timeoutMs: number;
  maxOutputTokens: number;
}

export type TranslationStatus = "pending" | "success" | "error" | "missing-key";

export interface TranslationResult {
  providerId: ProviderId;
  providerTitle: string;
  modelName?: string;
  status: TranslationStatus;
  translation?: string;
  error?: string;
  durationMs?: number;
}
