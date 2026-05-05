export const PROVIDER_IDS = ["deepseek", "mimo", "minimax", "gemini", "kimi", "openai"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

export type TranslationStyle = "balanced" | "faithful" | "polished" | "academic";

export type OCREngine = "local" | "tesseract" | "baidu" | "paddle" | "mineru";

export type OCRTextLayout = "formatted" | "compact";

export type ProviderAPIProtocol = "openai" | "anthropic";

export interface ExtensionPreferences {
  defaultProvider: ProviderId;
  targetLanguage: string;
  translationStyle: TranslationStyle;
  ocrEngine: OCREngine;
  ocrTextLayout: OCRTextLayout;
  ocrFallbackToLocal?: boolean;
  ocrTimeoutSeconds?: string;
  tesseractPath?: string;
  tesseractLanguages?: string;
  baiduOcrAPIKey?: string;
  baiduOcrSecretKey?: string;
  baiduOcrEndpoint?: string;
  baiduOcrLanguageType?: string;
  paddleOcrEndpoint?: string;
  paddleOcrAPIKey?: string;
  mineruBaseURL?: string;
  mineruLanguage?: string;
  mineruEnableTable?: boolean;
  mineruEnableFormula?: boolean;
  enableDeepSeek?: boolean;
  enableMiMo?: boolean;
  enableMiniMax?: boolean;
  enableGemini?: boolean;
  enableKimi?: boolean;
  enableOpenAI?: boolean;
  providerOrder?: string;
  requestTimeoutSeconds?: string;
  maxOutputTokens?: string;
  deepseekAPIKey?: string;
  deepseekBaseURL?: string;
  deepseekModel?: string;
  mimoAPIKey?: string;
  mimoBaseURL?: string;
  mimoModel?: string;
  minimaxAPIKey?: string;
  minimaxBaseURL?: string;
  minimaxModel?: string;
  geminiAPIKey?: string;
  geminiBaseURL?: string;
  geminiModel?: string;
  kimiAPIKey?: string;
  kimiBaseURL?: string;
  kimiModel?: string;
  openAIAPIKey?: string;
  openAIBaseURL?: string;
  openAIModel?: string;
}

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
  timeoutMs: number;
  maxOutputTokens: number;
}

export type TranslationStatus = "pending" | "success" | "error" | "missing-key";

export interface TranslationResult {
  providerId: ProviderId;
  providerTitle: string;
  status: TranslationStatus;
  translation?: string;
  error?: string;
  durationMs?: number;
}
