export const PROVIDER_IDS = ["gemini", "anthropic", "openai", "openai-compatible"] as const;

export type ProviderId = (typeof PROVIDER_IDS)[number];

/** Providers with a speech endpoint. The rest pronounce through the macOS system voice. */
export type TtsProviderId = Extract<ProviderId, "gemini" | "openai">;

export type ProviderConfig = {
  provider: ProviderId;
  apiKey: string;
  model: string;
  /** Raw "API Server URL" preference, possibly empty; each transport resolves it with `resolveBaseUrl`. */
  baseUrl: string;
  reasoningEffort?: string;
};

export type JsonRequest = {
  prompt: string;
  /** Response JSON schema in the Gemini dialect (with `propertyOrdering`); adapters rewrite it for their API. */
  schema: Record<string, unknown>;
  signal?: AbortSignal;
};

/** Returns the raw JSON text of the model's answer with code fences stripped. */
export type JsonTransport = (config: ProviderConfig, req: JsonRequest) => Promise<string>;

export type TtsConfig = {
  provider: TtsProviderId;
  apiKey: string;
  model: string;
  /** Raw "API Server URL" preference, possibly empty. */
  baseUrl: string;
};

export type TtsAdapter = {
  /** Returns a playable WAV file. */
  synthesize(text: string, langCode: string, config: TtsConfig, signal?: AbortSignal): Promise<Buffer>;
  supportsLanguage(langCode: string): boolean;
  /**
   * Part of the audio cache key. Bump it whenever the request changes how a
   * word sounds (prompt, voice, instructions) so stale audio is not replayed.
   */
  cacheVersion: string;
};
